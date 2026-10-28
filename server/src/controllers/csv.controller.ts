import { Response } from 'express';
import prisma from '../db';
import { AuthenticatedRequest } from '../types';
import { csvService, CsvEntityType, CSVService } from '../services/csv.service';
import { QueueService } from '../jobs/queue.service';


export class CsvController {
  public async getTemplate(req: AuthenticatedRequest, res: Response) {
    const { type } = req.params;
    const template = csvService.getTemplate(type.toUpperCase() as CsvEntityType);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type.toLowerCase()}_template.csv"`);
    return res.send(template);
  }

  public async previewImport(req: AuthenticatedRequest, res: Response) {
    const { type } = req.params;
    const { csvContent } = req.body;

    if (!csvContent) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'csvContent is required' });
    }

    const preview = csvService.previewCsv(type.toUpperCase() as CsvEntityType, csvContent);
    return res.json(preview);
  }

  public async executeImport(req: AuthenticatedRequest, res: Response) {
    const { type } = req.params;
    const { csvContent, filename } = req.body;
    const user = req.user!;

    if (!csvContent) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'csvContent is required' });
    }

    const preview = csvService.previewCsv(type.toUpperCase() as CsvEntityType, csvContent);
    if (preview.errors.length > 0) {
      return res.status(400).json({
        error: 'VALIDATION_FAILED',
        message: `CSV contains ${preview.errors.length} validation error(s). Please fix before importing.`,
        errors: preview.errors
      });
    }

    const totalRows = preview.totalRows;

    const job = await prisma.importJob.create({
      data: {
        entityType: type.toUpperCase(),
        filename: filename || `${type.toLowerCase()}_import.csv`,
        totalRows,
        importedRows: 0,
        failedRows: 0,
        status: totalRows > 100 ? 'PENDING' : 'PROCESSING',
        performedBy: user.name
      }
    });

    // If more than 100 rows, dispatch to background queue for resilient durable processing
    if (totalRows > 100) {
      await QueueService.enqueue({
        jobType: 'CSV_IMPORT',
        payload: {
          importJobId: job.id,
          entityType: type.toUpperCase(),
          rows: preview.allRecords,
          userId: user.id,
          organizationId: user.organizationId
        }
      });

      return res.json({
        success: true,
        queued: true,
        jobId: job.id,
        message: `Import containing ${totalRows} rows enqueued for durable background processing.`
      });
    }

    // Direct synchronous processing for immediate feedback on smaller batches
    try {
      const result = await CSVService.processImport(
        type.toUpperCase(),
        preview.allRecords,
        user.id,
        user.organizationId
      );

      // Record any row-level errors in ImportRowError
      if (result.errors.length > 0) {
        await prisma.importRowError.createMany({
          data: result.errors.map(e => ({
            jobId: job.id,
            rowNumber: e.rowNumber,
            field: 'processing',
            message: e.error
          }))
        });
      }



      await prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: result.errors.length === 0 ? 'COMPLETED' : 'FAILED',
          importedRows: result.importedCount,
          failedRows: result.errors.length
        }
      });

      return res.json({
        success: result.errors.length === 0,
        importedRows: result.importedCount,
        failedRows: result.errors.length,
        jobId: job.id
      });
    } catch (err: any) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', failedRows: totalRows }
      });
      return res.status(500).json({ error: 'IMPORT_ERROR', message: err.message });
    }
  }

  public async getHistory(req: AuthenticatedRequest, res: Response) {
    const jobs = await prisma.importJob.findMany({
      include: { errors: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(jobs);
  }

  public async exportData(req: AuthenticatedRequest, res: Response) {
    const { type } = req.params;
    const user = req.user!;

    let data: any[] = [];
    if (type.toLowerCase() === 'clients') {
      const clients = await prisma.client.findMany({
        where: { organizationId: user.organizationId },
        include: { contractTerms: { take: 1, orderBy: { effectiveFrom: 'desc' } } }
      });
      data = clients.map(c => ({
        code: c.code,
        name: c.name,
        status: c.status,
        billingModel: c.billingModel,
        billingRate: c.contractTerms[0]?.billingRate || 0,
        currency: c.currency,
        marginWarningThreshold: c.marginWarningThreshold
      }));
    } else if (type.toLowerCase() === 'roles') {
      const roles = await prisma.recruitmentRole.findMany({
        include: { client: true, recruiter: true }
      });
      data = roles.map(r => ({
        id: r.id,
        title: r.title,
        client: r.client.name,
        recruiter: r.recruiter?.name || 'Unassigned',
        stage: r.currentStage,
        status: r.status,
        deadline: r.slaDeadlineDate.toISOString().slice(0, 10),
        isBreached: r.isBreached
      }));
    } else if (type.toLowerCase() === 'billing') {
      const invoices = await prisma.invoice.findMany({
        include: { client: true }
      });
      data = invoices.map(i => ({
        invoiceNumber: i.invoiceNumber,
        client: i.client.name,
        amount: i.amount,
        currency: i.currency,
        status: i.status,
        periodStart: i.periodStart.toISOString().slice(0, 10),
        periodEnd: i.periodEnd.toISOString().slice(0, 10)
      }));
    }

    const csvStr = csvService.exportCsv(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type.toLowerCase()}_export.csv"`);
    return res.send(csvStr);
  }
}

export const csvController = new CsvController();



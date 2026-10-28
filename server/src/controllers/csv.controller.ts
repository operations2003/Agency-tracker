import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../types';
import { csvService, CsvEntityType } from '../services/csv.service';
import bcrypt from 'bcryptjs';

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

    const job = await prisma.importJob.create({
      data: {
        entityType: type.toUpperCase(),
        filename: filename || `${type.toLowerCase()}_import.csv`,
        totalRows: preview.totalRows,
        importedRows: 0,
        failedRows: 0,
        status: 'PROCESSING',
        performedBy: user.name
      }
    });

    let importedCount = 0;
    try {
      if (type.toUpperCase() === 'CLIENTS') {
        for (const row of preview.previewData) {
          const code = row.code.toUpperCase().trim();
          await prisma.client.upsert({
            where: { code },
            update: {
              name: row.name.trim(),
              billingModel: row.billingModel || 'RETAINER',
              marginWarningThreshold: row.marginWarningThreshold ? parseFloat(row.marginWarningThreshold) : 20.0
            },
            create: {
              organizationId: user.organizationId,
              name: row.name.trim(),
              code,
              billingModel: row.billingModel || 'RETAINER',
              currency: row.currency || 'USD',
              timeZone: row.timeZone || 'America/New_York',
              marginWarningThreshold: row.marginWarningThreshold ? parseFloat(row.marginWarningThreshold) : 20.0,
              deadlinePolicy: row.deadlinePolicy || 'WORKING_DAYS',
              contractTerms: {
                create: {
                  billingModel: row.billingModel || 'RETAINER',
                  billingRate: row.billingRate ? parseFloat(row.billingRate) : 0,
                  currency: row.currency || 'USD',
                  effectiveFrom: new Date()
                }
              }
            }
          });
          importedCount++;
        }
      } else if (type.toUpperCase() === 'RECRUITERS') {
        const defaultHash = await bcrypt.hash('Password123!', 10);
        for (const row of preview.previewData) {
          const email = row.email.toLowerCase().trim();
          const recruiter = await prisma.user.upsert({
            where: { email },
            update: { name: row.name, title: row.title },
            create: {
              organizationId: user.organizationId,
              email,
              name: row.name,
              role: 'RECRUITER',
              title: row.title || 'Technical Recruiter',
              passwordHash: defaultHash
            }
          });

          if (row.costType) {
            await prisma.recruiterCostProfile.create({
              data: {
                userId: recruiter.id,
                costType: row.costType,
                hourlyCostRate: row.hourlyRate ? parseFloat(row.hourlyRate) : null,
                monthlySalary: row.monthlySalary ? parseFloat(row.monthlySalary) : null,
                standardWeeklyHours: row.standardWeeklyHours ? parseFloat(row.standardWeeklyHours) : 40.0,
                overheadMultiplier: row.overheadMultiplier ? parseFloat(row.overheadMultiplier) : 0.0,
                effectiveFrom: new Date()
              }
            });
          }
          importedCount++;
        }
      }

      await prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          importedRows: importedCount
        }
      });

      return res.json({ success: true, importedRows: importedCount, jobId: job.id });
    } catch (err: any) {
      await prisma.importJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', failedRows: preview.totalRows - importedCount }
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
    }

    const csvStr = csvService.exportCsv(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type.toLowerCase()}_export.csv"`);
    return res.send(csvStr);
  }
}

export const csvController = new CsvController();


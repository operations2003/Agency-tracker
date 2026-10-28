import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../types';
import { marginController } from './margin.controller';

export class BillingController {
  public async getInvoices(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { clientId, status } = req.query;

    const where: any = {};
    if (clientId) where.clientId = clientId as string;
    if (status) where.status = status as string;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, code: true, currency: true } },
        lineItems: true
      },
      orderBy: { periodStart: 'desc' }
    });

    return res.json(invoices);
  }

  public async createInvoice(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { clientId, invoiceNumber, periodStart, periodEnd, amount, currency, notes, lineItems } = req.body;

    if (!clientId || !invoiceNumber || !periodStart || !periodEnd || amount === undefined) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'clientId, invoiceNumber, periodStart, periodEnd, and amount required' });
    }

    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        invoiceNumber: invoiceNumber.trim(),
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        amount: parseFloat(amount),
        currency: currency || 'USD',
        notes,
        ...(lineItems && Array.isArray(lineItems) && {
          lineItems: {
            create: lineItems.map((item: any) => ({
              description: item.description,
              quantity: parseFloat(item.quantity || '1.0'),
              unitPrice: parseFloat(item.unitPrice || item.amount),
              amount: parseFloat(item.amount)
            }))
          }
        })
      },
      include: { lineItems: true, client: true }
    });

    return res.status(201).json(invoice);
  }

  public async recordBillableHire(req: AuthenticatedRequest, res: Response) {
    const { clientId, roleId, candidateName, hireDate, feeAmount, currency } = req.body;

    if (!clientId || !roleId || !candidateName || !feeAmount) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'clientId, roleId, candidateName, and feeAmount required' });
    }

    const hire = await prisma.billableHire.create({
      data: {
        clientId,
        roleId,
        candidateName: candidateName.trim(),
        hireDate: hireDate ? new Date(hireDate) : new Date(),
        feeAmount: parseFloat(feeAmount),
        currency: currency || 'USD'
      },
      include: { client: true, role: true }
    });

    return res.status(201).json(hire);
  }

  public async recordFinancialAdjustment(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { clientId, amount, reason, date } = req.body;

    if (!clientId || amount === undefined || !reason) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'clientId, amount, and reason required' });
    }

    const adjustment = await prisma.financialAdjustment.create({
      data: {
        clientId,
        amount: parseFloat(amount),
        reason,
        date: date ? new Date(date) : new Date(),
        approvedBy: user.name
      },
      include: { client: true }
    });

    return res.status(201).json(adjustment);
  }

  public async getReconciliation(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const margins = await marginController.computeMarginsForClients(user.organizationId, undefined, start, end);

    const invoices = await prisma.invoice.findMany({
      where: { periodStart: { gte: start, lte: end } },
      include: { client: true }
    });

    const clientReconciliations = margins.map(m => {
      const clientInvoices = invoices.filter(i => i.clientId === m.clientId);
      const totalInvoiced = clientInvoices.reduce((acc, i) => acc + i.amount, 0);
      const recognized = m.totalRevenue;
      const difference = Math.round((recognized - totalInvoiced) * 100) / 100;

      let status = 'BALANCED';
      if (difference > 0) status = 'UNINVOICED_REVENUE';
      else if (difference < 0) status = 'PREPAID_OVERBILL';

      return {
        clientId: m.clientId,
        clientName: m.clientName,
        clientCode: m.clientCode,
        billingModel: m.billingModel,
        recognizedRevenue: recognized,
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        difference,
        status,
        invoicesCount: clientInvoices.length
      };
    });

    return res.json({
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      reconciliation: clientReconciliations
    });
  }
}

export const billingController = new BillingController();


import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, BillingModel, MarginCalculationResult } from '../types';
import { marginEngine, RecruiterLaborCost } from '../services/margin.service';

export class MarginController {
  /**
   * Helper to compute margin result for a set of clients over a date range
   */
  public async computeMarginsForClients(
    organizationId: string,
    clientIds: string[] | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<MarginCalculationResult[]> {
    const clientWhere: any = { organizationId };
    if (clientIds && clientIds.length > 0) {
      clientWhere.id = { in: clientIds };
    }

    const clients = await prisma.client.findMany({
      where: clientWhere,
      include: {
        contractTerms: {
          orderBy: { effectiveFrom: 'desc' }
        },
        timeEntries: {
          where: {
            workDate: { gte: startDate, lte: endDate }
          },
          include: {
            recruiter: {
              include: {
                costProfiles: { orderBy: { effectiveFrom: 'desc' } }
              }
            }
          }
        },
        billableHires: {
          where: {
            hireDate: { gte: startDate, lte: endDate }
          }
        },
        adjustments: {
          where: {
            date: { gte: startDate, lte: endDate }
          }
        }
      }
    });

    const results: MarginCalculationResult[] = [];

    for (const client of clients) {
      // Find applicable contract term
      const activeTerm = client.contractTerms.find(t => t.effectiveFrom <= endDate) || client.contractTerms[0];
      const billingModel = (activeTerm?.billingModel || client.billingModel) as BillingModel;
      const billingRate = activeTerm?.billingRate || 0;

      // Group labor costs by recruiter
      const recruiterMap = new Map<string, {
        recruiterId: string;
        recruiterName: string;
        approvedHours: number;
        costProfile: any;
      }>();

      let unapprovedHours = 0;
      let approvedBillableHours = 0;

      for (const entry of client.timeEntries) {
        if (entry.status === 'APPROVED') {
          if (entry.isBillable) {
            approvedBillableHours += entry.hours;
          }
          const existing = recruiterMap.get(entry.recruiterId) || {
            recruiterId: entry.recruiterId,
            recruiterName: entry.recruiter.name,
            approvedHours: 0,
            costProfile: entry.recruiter.costProfiles[0] || null
          };
          existing.approvedHours += entry.hours;
          recruiterMap.set(entry.recruiterId, existing);
        } else if (entry.status === 'SUBMITTED' || entry.status === 'DRAFT') {
          unapprovedHours += entry.hours;
        }
      }

      const recruiterLaborCosts: RecruiterLaborCost[] = [];
      for (const r of recruiterMap.values()) {
        const cp = r.costProfile;
        const calculatedCost = marginEngine.calculateLaborCost({
          hours: r.approvedHours,
          costType: (cp?.costType as any) || 'HOURLY',
          hourlyRate: cp?.hourlyCostRate || 40.0,
          monthlySalary: cp?.monthlySalary || null,
          standardWeeklyHours: cp?.standardWeeklyHours || 40.0,
          overheadMultiplier: cp?.overheadMultiplier || 0.0
        });

        recruiterLaborCosts.push({
          recruiterId: r.recruiterId,
          recruiterName: r.recruiterName,
          hours: r.approvedHours,
          costType: (cp?.costType as any) || 'HOURLY',
          hourlyRate: cp?.hourlyCostRate,
          monthlySalary: cp?.monthlySalary,
          calculatedCost
        });
      }

      // Sum financial adjustments
      let financialAdjustmentsAmount = 0;
      for (const adj of client.adjustments) {
        financialAdjustmentsAmount += adj.amount;
      }

      // Sum hires
      const billableHiresCount = client.billableHires.length;
      let perHireFeeRate = billingRate;
      if (billingModel === 'PER_HIRE' && client.billableHires.length > 0) {
        perHireFeeRate = client.billableHires.reduce((acc, h) => acc + h.feeAmount, 0) / client.billableHires.length;
      }

      const marginCalc = marginEngine.calculateClientMargin({
        clientId: client.id,
        clientName: client.name,
        clientCode: client.code,
        billingModel,
        currency: client.currency,
        marginWarningThreshold: client.marginWarningThreshold,
        periodStart: startDate,
        periodEnd: endDate,
        retainerMonthlyRate: billingModel === 'RETAINER' ? billingRate : undefined,
        approvedBillableHours,
        hourlyBillingRate: billingModel === 'HOURLY' ? billingRate : undefined,
        billableHiresCount,
        perHireFeeRate: billingModel === 'PER_HIRE' ? perHireFeeRate : undefined,
        financialAdjustmentsAmount,
        unapprovedHours,
        recruiterLaborCosts
      });

      results.push(marginCalc);
    }

    return results;
  }

  public async getSummary(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const allowedClientIds = (user.role === 'MANAGER' || user.role === 'RECRUITER')
      ? user.assignedClientIds
      : undefined;

    const margins = await this.computeMarginsForClients(user.organizationId, allowedClientIds, start, end);

    let totalRevenue = 0;
    let totalDirectCost = 0;
    let totalUnapprovedHours = 0;
    let clientsBelowThresholdCount = 0;

    for (const m of margins) {
      totalRevenue += m.totalRevenue;
      totalDirectCost += m.directCost;
      totalUnapprovedHours += m.unapprovedHours;
      if (m.isBelowThreshold) {
        clientsBelowThresholdCount++;
      }
    }

    totalRevenue = Math.round(totalRevenue * 100) / 100;
    totalDirectCost = Math.round(totalDirectCost * 100) / 100;
    const totalProfit = Math.round((totalRevenue - totalDirectCost) * 100) / 100;
    let agencyMarginPercentage: number | null = null;
    if (totalRevenue > 0) {
      agencyMarginPercentage = Math.round((totalProfit / totalRevenue) * 10000) / 100;
    }

    const lowestMarginClients = [...margins]
      .sort((a, b) => (a.profitMarginPercentage ?? -999) - (b.profitMarginPercentage ?? -999))
      .slice(0, 5);

    return res.json({
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      totalRevenue,
      totalDirectCost,
      totalProfit,
      agencyMarginPercentage,
      totalClients: margins.length,
      clientsBelowThresholdCount,
      totalUnapprovedHours: Math.round(totalUnapprovedHours * 100) / 100,
      isProvisional: totalUnapprovedHours > 0,
      lowestMarginClients
    });
  }

  public async getClientMargins(req: AuthenticatedRequest, res: Response) {
    const user = req.user!;
    const { startDate, endDate, sortBy, order } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const allowedClientIds = (user.role === 'MANAGER' || user.role === 'RECRUITER')
      ? user.assignedClientIds
      : undefined;

    let margins = await this.computeMarginsForClients(user.organizationId, allowedClientIds, start, end);

    // Sorting
    if (sortBy === 'margin') {
      margins.sort((a, b) => {
        const valA = a.profitMarginPercentage ?? -9999;
        const valB = b.profitMarginPercentage ?? -9999;
        return order === 'desc' ? valB - valA : valA - valB;
      });
    } else if (sortBy === 'revenue') {
      margins.sort((a, b) => order === 'desc' ? b.totalRevenue - a.totalRevenue : a.totalRevenue - b.totalRevenue);
    } else if (sortBy === 'profit') {
      margins.sort((a, b) => order === 'desc' ? b.profit - a.profit : a.profit - b.profit);
    } else if (sortBy === 'cost') {
      margins.sort((a, b) => order === 'desc' ? b.directCost - a.directCost : a.directCost - b.directCost);
    }

    return res.json(margins);
  }

  public async getClientDrilldown(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const user = req.user!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    const margins = await this.computeMarginsForClients(user.organizationId, [id], start, end);
    if (margins.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Client margin data not found' });
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: { clientId: id, workDate: { gte: start, lte: end } },
      include: { recruiter: { select: { id: true, name: true, email: true } }, role: true },
      orderBy: { workDate: 'desc' }
    });

    return res.json({
      summary: margins[0],
      timeEntries
    });
  }
}

export const marginController = new MarginController();

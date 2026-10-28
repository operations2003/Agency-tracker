import { BillingModel, MarginCalculationResult } from '../types';

export interface RecruiterLaborCost {
  recruiterId: string;
  recruiterName: string;
  hours: number;
  costType: 'HOURLY' | 'SALARIED';
  hourlyRate?: number;
  monthlySalary?: number;
  standardWeeklyHours?: number;
  overheadMultiplier?: number;
  calculatedCost: number;
}

export interface ClientMarginInput {
  clientId: string;
  clientName: string;
  clientCode: string;
  billingModel: BillingModel;
  currency: string;
  marginWarningThreshold: number;
  periodStart: Date;
  periodEnd: Date;
  // Financial inputs
  retainerMonthlyRate?: number;
  approvedBillableHours?: number;
  hourlyBillingRate?: number;
  billableHiresCount?: number;
  perHireFeeRate?: number;
  financialAdjustmentsAmount?: number;
  unapprovedHours?: number;
  recruiterLaborCosts: RecruiterLaborCost[];
  otherDirectCosts?: number;
}

export class MarginCalculationEngine {
  /**
   * Calculates financial revenue according to the client's contractual billing model:
   * - RETAINER: contractual retainer prorated to the reporting period
   * - HOURLY: approved billable hours * client billing rate
   * - PER_HIRE: confirmed billable hires count * per-hire fee
   * Plus any approved financial adjustments (credits/debits/penalties)
   */
  public calculateRevenue(input: ClientMarginInput): {
    retainerRevenue: number;
    hourlyRevenue: number;
    perHireRevenue: number;
    adjustmentsRevenue: number;
    totalRevenue: number;
  } {
    let retainerRevenue = 0;
    let hourlyRevenue = 0;
    let perHireRevenue = 0;
    const adjustmentsRevenue = input.financialAdjustmentsAmount || 0;

    switch (input.billingModel) {
      case 'RETAINER': {
        const monthly = input.retainerMonthlyRate || 0;
        // Calculate days in period
        const periodMs = input.periodEnd.getTime() - input.periodStart.getTime();
        const periodDays = Math.max(1, Math.round(periodMs / (1000 * 60 * 60 * 24)));
        // Assuming standard 30-day billing month for proration
        const prorated = (monthly / 30) * periodDays;
        retainerRevenue = Math.round(prorated * 100) / 100;
        break;
      }
      case 'HOURLY': {
        const hours = input.approvedBillableHours || 0;
        const rate = input.hourlyBillingRate || 0;
        hourlyRevenue = Math.round(hours * rate * 100) / 100;
        break;
      }
      case 'PER_HIRE': {
        const hires = input.billableHiresCount || 0;
        const fee = input.perHireFeeRate || 0;
        perHireRevenue = Math.round(hires * fee * 100) / 100;
        break;
      }
    }

    const totalRevenue = Math.round((retainerRevenue + hourlyRevenue + perHireRevenue + adjustmentsRevenue) * 100) / 100;

    return {
      retainerRevenue,
      hourlyRevenue,
      perHireRevenue,
      adjustmentsRevenue,
      totalRevenue
    };
  }

  /**
   * Calculates direct recruiter labor cost using either:
   * 1. Hourly cost: approved hours * hourly cost rate * (1 + overhead)
   * 2. Salaried cost: (monthly salary / (standard weekly hours * 4.33)) * approved hours * (1 + overhead)
   */
  public calculateLaborCost(labor: {
    hours: number;
    costType: 'HOURLY' | 'SALARIED';
    hourlyRate?: number;
    monthlySalary?: number;
    standardWeeklyHours?: number;
    overheadMultiplier?: number;
  }): number {
    const overhead = labor.overheadMultiplier || 0;
    const overheadFactor = 1 + overhead;

    if (labor.costType === 'HOURLY') {
      const rate = labor.hourlyRate || 0;
      return Math.round(labor.hours * rate * overheadFactor * 100) / 100;
    } else {
      // Salaried allocation
      const monthly = labor.monthlySalary || 0;
      const weeklyHours = labor.standardWeeklyHours || 40;
      // Average 4.333 weeks in a month
      const monthlyHours = weeklyHours * 4.333333;
      const effectiveHourlyCost = monthlyHours > 0 ? monthly / monthlyHours : 0;
      return Math.round(labor.hours * effectiveHourlyCost * overheadFactor * 100) / 100;
    }
  }

  /**
   * Computes comprehensive margin calculation for a client
   */
  public calculateClientMargin(input: ClientMarginInput): MarginCalculationResult {
    const revenue = this.calculateRevenue(input);

    let directLaborCost = 0;
    for (const item of input.recruiterLaborCosts) {
      directLaborCost += item.calculatedCost;
    }
    directLaborCost = Math.round(directLaborCost * 100) / 100;

    const directOtherCost = Math.round((input.otherDirectCosts || 0) * 100) / 100;
    const directCost = Math.round((directLaborCost + directOtherCost) * 100) / 100;

    // Profit = Revenue - Direct Cost
    const profit = Math.round((revenue.totalRevenue - directCost) * 100) / 100;

    // Profit Margin (%) = (Profit / Revenue) * 100
    // Edge case: If revenue is zero, profit margin is NOT APPLICABLE
    let profitMarginPercentage: number | null = null;
    let marginStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'NO_REVENUE_DEFICIT' | 'NO_ACTIVITY' = 'HEALTHY';

    if (revenue.totalRevenue === 0) {
      profitMarginPercentage = null;
      if (directCost > 0) {
        marginStatus = 'NO_REVENUE_DEFICIT';
      } else {
        marginStatus = 'NO_ACTIVITY';
      }
    } else {
      profitMarginPercentage = Math.round((profit / revenue.totalRevenue) * 10000) / 100;
      if (profitMarginPercentage < 0) {
        marginStatus = 'CRITICAL';
      } else if (profitMarginPercentage < input.marginWarningThreshold) {
        marginStatus = 'WARNING';
      } else {
        marginStatus = 'HEALTHY';
      }
    }

    const isBelowThreshold = profitMarginPercentage !== null && profitMarginPercentage < input.marginWarningThreshold;
    const unapprovedHours = input.unapprovedHours || 0;
    const isProvisional = unapprovedHours > 0;

    let approvedHours = 0;
    for (const c of input.recruiterLaborCosts) {
      approvedHours += c.hours;
    }

    return {
      clientId: input.clientId,
      clientName: input.clientName,
      clientCode: input.clientCode,
      billingModel: input.billingModel,
      periodStart: input.periodStart.toISOString(),
      periodEnd: input.periodEnd.toISOString(),
      currency: input.currency,
      retainerRevenue: revenue.retainerRevenue,
      hourlyRevenue: revenue.hourlyRevenue,
      perHireRevenue: revenue.perHireRevenue,
      adjustmentsRevenue: revenue.adjustmentsRevenue,
      totalRevenue: revenue.totalRevenue,
      directCost,
      directLaborCost,
      directOtherCost,
      profit,
      profitMarginPercentage,
      marginStatus,
      warningThreshold: input.marginWarningThreshold,
      isBelowThreshold,
      isProvisional,
      unapprovedHours: Math.round(unapprovedHours * 100) / 100,
      approvedHours: Math.round(approvedHours * 100) / 100
    };
  }
}

export const marginEngine = new MarginCalculationEngine();

import { MarginCalculationResult, SlaCalculationResult, RecruiterWorkloadResult } from '../types';

export interface WeeklySummaryData {
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  totalRecognizedRevenue: number;
  totalDirectCost: number;
  totalProfit: number;
  agencyMarginPercentage: number | null;
  lowestMarginClients: Array<{
    clientName: string;
    billingModel: string;
    revenue: number;
    cost: number;
    marginPercentage: number | null;
    status: string;
  }>;
  slaSummary: {
    totalActiveRoles: number;
    amberWarningsCount: number;
    redWarningsCount: number;
    breachedCount: number;
    completedInPeriodCount: number;
  };
  recruiterOverloadSummary: Array<{
    recruiterName: string;
    openRoleCount: number;
    weeklyHours: number;
    utilizationPercentage: number;
  }>;
  unresolvedAlertsCount: number;
  dataQualityWarning: {
    hasUnapprovedHours: boolean;
    unapprovedHoursCount: number;
    message?: string;
  };
}

export class WeeklyReportService {
  /**
   * Compiles the weekly summary payload
   */
  public generateWeeklySummary(params: {
    periodStart: Date;
    periodEnd: Date;
    marginResults: MarginCalculationResult[];
    slaResults: SlaCalculationResult[];
    workloadResults: RecruiterWorkloadResult[];
    unresolvedAlertsCount: number;
  }): WeeklySummaryData {
    let totalRecognizedRevenue = 0;
    let totalDirectCost = 0;
    let totalUnapprovedHours = 0;

    params.marginResults.forEach(m => {
      totalRecognizedRevenue += m.totalRevenue;
      totalDirectCost += m.directCost;
      totalUnapprovedHours += m.unapprovedHours;
    });

    totalRecognizedRevenue = Math.round(totalRecognizedRevenue * 100) / 100;
    totalDirectCost = Math.round(totalDirectCost * 100) / 100;
    const totalProfit = Math.round((totalRecognizedRevenue - totalDirectCost) * 100) / 100;

    let agencyMarginPercentage: number | null = null;
    if (totalRecognizedRevenue > 0) {
      agencyMarginPercentage = Math.round((totalProfit / totalRecognizedRevenue) * 10000) / 100;
    }

    // Lowest margin clients (filtered and sorted ascending by margin)
    const lowestMarginClients = [...params.marginResults]
      .sort((a, b) => {
        const aVal = a.profitMarginPercentage !== null ? a.profitMarginPercentage : -9999;
        const bVal = b.profitMarginPercentage !== null ? b.profitMarginPercentage : -9999;
        return aVal - bVal;
      })
      .slice(0, 5)
      .map(m => ({
        clientName: m.clientName,
        billingModel: m.billingModel,
        revenue: m.totalRevenue,
        cost: m.directCost,
        marginPercentage: m.profitMarginPercentage,
        status: m.marginStatus
      }));

    // SLA breakdown
    let amberWarningsCount = 0;
    let redWarningsCount = 0;
    let breachedCount = 0;
    let completedInPeriodCount = 0;

    params.slaResults.forEach(s => {
      if (s.slaStatus === 'AMBER') amberWarningsCount++;
      if (s.slaStatus === 'RED') redWarningsCount++;
      if (s.slaStatus === 'BREACHED' || s.isBreached) breachedCount++;
      if (s.slaStatus === 'COMPLETED') completedInPeriodCount++;
    });

    // Overloaded recruiters
    const recruiterOverloadSummary = params.workloadResults
      .filter(w => w.isOverloaded)
      .map(w => ({
        recruiterName: w.recruiterName,
        openRoleCount: w.openRoleCount,
        weeklyHours: w.totalRecordedHoursThisWeek,
        utilizationPercentage: w.utilizationPercentage
      }));

    const hasUnapprovedHours = totalUnapprovedHours > 0;
    const dataQualityWarning = {
      hasUnapprovedHours,
      unapprovedHoursCount: totalUnapprovedHours,
      message: hasUnapprovedHours
        ? `Warning: ${totalUnapprovedHours} hours across recruiters are currently submitted/unapproved. Financial profit margins are provisional.`
        : undefined
    };

    return {
      periodStart: params.periodStart.toISOString(),
      periodEnd: params.periodEnd.toISOString(),
      generatedAt: new Date().toISOString(),
      totalRecognizedRevenue,
      totalDirectCost,
      totalProfit,
      agencyMarginPercentage,
      lowestMarginClients,
      slaSummary: {
        totalActiveRoles: params.slaResults.length,
        amberWarningsCount,
        redWarningsCount,
        breachedCount,
        completedInPeriodCount
      },
      recruiterOverloadSummary,
      unresolvedAlertsCount: params.unresolvedAlertsCount,
      dataQualityWarning
    };
  }

  /**
   * Generates formatted text/HTML content for weekly executive email
   */
  public formatSummaryEmail(summary: WeeklySummaryData): { subject: string; html: string; text: string } {
    const subject = `Weekly Executive Summary: $${summary.totalRecognizedRevenue.toLocaleString()} Revenue | ${summary.lowestMarginClients.length} Accounts at Risk`;
    
    const text = `
AGENCY SLA AND MARGIN LEAKAGE TRACKER — WEEKLY MANAGEMENT REPORT
Reporting Period: ${summary.periodStart.slice(0, 10)} to ${summary.periodEnd.slice(0, 10)}
Generated: ${summary.generatedAt}

FINANCIAL KPI OVERVIEW:
- Total Recognized Revenue: $${summary.totalRecognizedRevenue.toFixed(2)}
- Total Direct Costs: $${summary.totalDirectCost.toFixed(2)}
- Total Profit: $${summary.totalProfit.toFixed(2)}
- Agency Profit Margin: ${summary.agencyMarginPercentage !== null ? summary.agencyMarginPercentage + '%' : 'N/A'}

LOWEST MARGIN CLIENTS:
${summary.lowestMarginClients.map(c => `• ${c.clientName} (${c.billingModel}): Margin ${c.marginPercentage !== null ? c.marginPercentage + '%' : 'N/A'} (Revenue: $${c.revenue}, Cost: $${c.cost})`).join('\n')}

SLA STATUS SUMMARY:
- Total Active Roles: ${summary.slaSummary.totalActiveRoles}
- Amber Warnings: ${summary.slaSummary.amberWarningsCount}
- Red Warnings: ${summary.slaSummary.redWarningsCount}
- Contractual Breaches: ${summary.slaSummary.breachedCount}
- Completed in Period: ${summary.slaSummary.completedInPeriodCount}

OVERLOADED RECRUITERS:
${summary.recruiterOverloadSummary.length > 0
  ? summary.recruiterOverloadSummary.map(r => `• ${r.recruiterName}: ${r.openRoleCount} roles, ${r.weeklyHours}h recorded (${r.utilizationPercentage}% capacity)`).join('\n')
  : 'None — all recruiters within configured thresholds.'}

DATA QUALITY & ACCURACY:
${summary.dataQualityWarning.message || 'All time entries for the period are officially approved.'}
    `.trim();

    const html = `
<div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
  <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #0f172a; color: #ffffff; padding: 20px 24px;">
      <h2 style="margin: 0 0 6px 0; font-size: 20px;">Agency SLA & Margin Leakage Tracker</h2>
      <p style="margin: 0; font-size: 13px; color: #94a3b8;">Weekly Management Report (${summary.periodStart.slice(0, 10)} to ${summary.periodEnd.slice(0, 10)})</p>
    </div>
    <div style="padding: 24px;">
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <div style="flex: 1; padding: 12px; background: #f1f5f9; border-radius: 6px;">
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Revenue</div>
          <div style="font-size: 18px; font-weight: bold; color: #0f172a;">$${summary.totalRecognizedRevenue.toFixed(2)}</div>
        </div>
        <div style="flex: 1; padding: 12px; background: #f1f5f9; border-radius: 6px;">
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Direct Cost</div>
          <div style="font-size: 18px; font-weight: bold; color: #0f172a;">$${summary.totalDirectCost.toFixed(2)}</div>
        </div>
        <div style="flex: 1; padding: 12px; background: #f1f5f9; border-radius: 6px;">
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Margin</div>
          <div style="font-size: 18px; font-weight: bold; color: #0284c7;">${summary.agencyMarginPercentage !== null ? summary.agencyMarginPercentage + '%' : 'N/A'}</div>
        </div>
      </div>
      <h4 style="margin: 16px 0 8px 0; font-size: 14px; color: #1e293b;">Accounts with Margin Risk</h4>
      <ul>
        ${summary.lowestMarginClients.map(c => `<li><strong>${c.clientName}</strong>: ${c.marginPercentage !== null ? c.marginPercentage + '%' : 'N/A'} (Rev: $${c.revenue}, Cost: $${c.cost})</li>`).join('')}
      </ul>
      <h4 style="margin: 16px 0 8px 0; font-size: 14px; color: #1e293b;">SLA Deadlines & Performance</h4>
      <p style="font-size: 13px; color: #475569;">
        ${summary.slaSummary.amberWarningsCount} Amber Warnings | ${summary.slaSummary.redWarningsCount} Red Warnings | <strong>${summary.slaSummary.breachedCount} Breaches</strong>
      </p>
      ${summary.dataQualityWarning.message ? `<div style="background: #fffbeb; border: 1px solid #fef3c7; color: #b45309; padding: 10px; border-radius: 6px; font-size: 12px; margin-top: 16px;">${summary.dataQualityWarning.message}</div>` : ''}
    </div>
  </div>
</div>
    `.trim();

    return { subject, text, html };
  }
}

export const weeklyReportService = new WeeklyReportService();

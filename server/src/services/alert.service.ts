import { AlertSeverity, AlertType, AlertStatus } from '../types';

export interface AlertTriggerInput {
  organizationId: string;
  type: AlertType;
  severity: AlertSeverity;
  clientId?: string;
  roleId?: string;
  recruiterId?: string;
  triggerRule: string;
  thresholdValue?: number;
  actualValue?: number;
  message: string;
  deduplicationKey: string;
}

export class AlertEngine {
  /**
   * Generates a stable deduplication key for an alert to prevent duplicate notifications
   */
  public generateDeduplicationKey(
    type: AlertType,
    entityId: string,
    ruleIdentifier: string,
    periodOrDay?: string
  ): string {
    const period = periodOrDay || new Date().toISOString().slice(0, 10);
    return `${type}:${entityId}:${ruleIdentifier}:${period}`;
  }

  /**
   * Evaluates Rule 1: Amber SLA warning
   */
  public evaluateRule1AmberSla(params: {
    roleId: string;
    roleTitle: string;
    clientName: string;
    clientId: string;
    consumptionPercentage: number;
    thresholdPercentage: number; // default 70.0
    isShortlistMilestoneReached: boolean;
  }): AlertTriggerInput | null {
    if (params.consumptionPercentage >= params.thresholdPercentage && !params.isShortlistMilestoneReached) {
      const dedupKey = this.generateDeduplicationKey('AMBER_SLA', params.roleId, '70pct_milestone');
      return {
        organizationId: 'default',
        type: 'AMBER_SLA',
        severity: 'WARNING',
        clientId: params.clientId,
        roleId: params.roleId,
        triggerRule: `RULE 1 — AMBER SLA WARNING (≥${params.thresholdPercentage}% consumed without shortlist)`,
        thresholdValue: params.thresholdPercentage,
        actualValue: params.consumptionPercentage,
        message: `Role "${params.roleTitle}" for ${params.clientName} has consumed ${params.consumptionPercentage}% of SLA without shortlist submission.`,
        deduplicationKey: dedupKey
      };
    }
    return null;
  }

  /**
   * Evaluates Rule 2: Red SLA warning or breach
   */
  public evaluateRule2RedSla(params: {
    roleId: string;
    roleTitle: string;
    clientName: string;
    clientId: string;
    consumptionPercentage: number;
    thresholdPercentage: number; // default 90.0
    isBreached: boolean;
  }): AlertTriggerInput | null {
    if (params.isBreached) {
      const dedupKey = this.generateDeduplicationKey('RED_SLA', params.roleId, 'breached');
      return {
        organizationId: 'default',
        type: 'RED_SLA',
        severity: 'CRITICAL',
        clientId: params.clientId,
        roleId: params.roleId,
        triggerRule: 'RULE 2 — RED SLA BREACHED',
        thresholdValue: 100.0,
        actualValue: params.consumptionPercentage,
        message: `Contractual SLA BREACHED for role "${params.roleTitle}" (${params.clientName})!`,
        deduplicationKey: dedupKey
      };
    }

    if (params.consumptionPercentage >= params.thresholdPercentage) {
      const dedupKey = this.generateDeduplicationKey('RED_SLA', params.roleId, '90pct');
      return {
        organizationId: 'default',
        type: 'RED_SLA',
        severity: 'CRITICAL',
        clientId: params.clientId,
        roleId: params.roleId,
        triggerRule: `RULE 2 — RED SLA WARNING (≥${params.thresholdPercentage}% consumed)`,
        thresholdValue: params.thresholdPercentage,
        actualValue: params.consumptionPercentage,
        message: `Critical: Role "${params.roleTitle}" (${params.clientName}) has consumed ${params.consumptionPercentage}% of contractual SLA deadline!`,
        deduplicationKey: dedupKey
      };
    }

    return null;
  }

  /**
   * Evaluates Rule 3: Low Margin Warning
   */
  public evaluateRule3LowMargin(params: {
    clientId: string;
    clientName: string;
    profitMarginPercentage: number | null;
    marginThreshold: number; // default 20.0
    reportingPeriodStr: string;
    isNoRevenueDeficit?: boolean;
  }): AlertTriggerInput | null {
    if (params.isNoRevenueDeficit) {
      const dedupKey = this.generateDeduplicationKey('LOW_MARGIN', params.clientId, 'deficit', params.reportingPeriodStr);
      return {
        organizationId: 'default',
        type: 'LOW_MARGIN',
        severity: 'CRITICAL',
        clientId: params.clientId,
        triggerRule: 'RULE 3 — LOW MARGIN (Direct Cost Deficit with Zero Revenue)',
        thresholdValue: params.marginThreshold,
        actualValue: 0,
        message: `Client "${params.clientName}" has direct labor costs recorded but zero recognized revenue for period ${params.reportingPeriodStr}.`,
        deduplicationKey: dedupKey
      };
    }

    if (params.profitMarginPercentage !== null && params.profitMarginPercentage < params.marginThreshold) {
      const severity: AlertSeverity = params.profitMarginPercentage < 0 ? 'CRITICAL' : 'WARNING';
      const dedupKey = this.generateDeduplicationKey('LOW_MARGIN', params.clientId, 'threshold', params.reportingPeriodStr);
      return {
        organizationId: 'default',
        type: 'LOW_MARGIN',
        severity,
        clientId: params.clientId,
        triggerRule: `RULE 3 — LOW MARGIN (Below ${params.marginThreshold}%)`,
        thresholdValue: params.marginThreshold,
        actualValue: params.profitMarginPercentage,
        message: `Client "${params.clientName}" margin is ${params.profitMarginPercentage}% (below contractual safety threshold of ${params.marginThreshold}%).`,
        deduplicationKey: dedupKey
      };
    }

    return null;
  }

  /**
   * Evaluates Rule 4: Recruiter Overload Warning
   */
  public evaluateRule4RecruiterOverload(params: {
    recruiterId: string;
    recruiterName: string;
    openRoleCount: number;
    maxOpenRolesThreshold: number;
    weeklyHours: number;
    maxWeeklyHoursThreshold: number;
    weekStr: string;
  }): AlertTriggerInput | null {
    const isOverloadedRoles = params.openRoleCount > params.maxOpenRolesThreshold;
    const isOverloadedHours = params.weeklyHours > params.maxWeeklyHoursThreshold;

    if (isOverloadedRoles || isOverloadedHours) {
      const reasons: string[] = [];
      if (isOverloadedRoles) {
        reasons.push(`${params.openRoleCount} open roles (limit: ${params.maxOpenRolesThreshold})`);
      }
      if (isOverloadedHours) {
        reasons.push(`${params.weeklyHours} hours recorded (limit: ${params.maxWeeklyHoursThreshold}h)`);
      }

      const dedupKey = this.generateDeduplicationKey('RECRUITER_OVERLOAD', params.recruiterId, 'capacity', params.weekStr);
      return {
        organizationId: 'default',
        type: 'RECRUITER_OVERLOAD',
        severity: 'WARNING',
        recruiterId: params.recruiterId,
        triggerRule: 'RULE 4 — RECRUITER OVERLOAD',
        thresholdValue: params.maxOpenRolesThreshold,
        actualValue: params.openRoleCount,
        message: `Recruiter ${params.recruiterName} is overloaded: ${reasons.join(' and ')}.`,
        deduplicationKey: dedupKey
      };
    }

    return null;
  }
}

export const alertEngine = new AlertEngine();

import { DeadlinePolicy, PipelineStage, RoleStatus, SlaCalculationResult } from '../types';
import { calculateCalendarHours, calculateWorkingHours, isNonWorkingDay } from '../utils/date-utils';

export interface SlaRoleInput {
  roleId: string;
  roleTitle: string;
  clientName: string;
  recruiterName: string | null;
  priority: string;
  status: RoleStatus;
  currentStage: PipelineStage;
  requestReceivedDate: Date;
  slaStartDate: Date;
  slaDeadlineDate: Date;
  deadlinePolicy: DeadlinePolicy;
  shortlistSubmittedDate: Date | null;
  shortlistMilestoneStage?: PipelineStage;
  pauseOnHold?: boolean;
  clientHolidays?: string[]; // YYYY-MM-DD
  businessHourStart?: number;
  businessHourEnd?: number;
  now?: Date;
}

export class SlaClockEngine {
  /**
   * Evaluates the SLA clock and risk state for a recruitment role
   */
  public evaluateRoleSla(input: SlaRoleInput): SlaCalculationResult {
    const now = input.now || new Date();
    const isWorkingDays = input.deadlinePolicy === 'WORKING_DAYS';

    const workingConfig = {
      holidays: input.clientHolidays || [],
      businessHourStart: input.businessHourStart ?? 9,
      businessHourEnd: input.businessHourEnd ?? 17
    };

    // Calculate total duration in hours
    const totalDurationHours = isWorkingDays
      ? calculateWorkingHours(input.slaStartDate, input.slaDeadlineDate, workingConfig)
      : calculateCalendarHours(input.slaStartDate, input.slaDeadlineDate);

    // Shortlist milestone completion check
    const milestoneTarget = input.shortlistMilestoneStage || 'SHORTLIST_SUBMITTED';
    const stagesOrdered: PipelineStage[] = [
      'NEW_REQUEST',
      'SOURCING',
      'SCREENING',
      'SHORTLISTING',
      'SHORTLIST_SUBMITTED',
      'INTERVIEW',
      'OFFER',
      'HIRED_FILLED'
    ];
    
    const currentIndex = stagesOrdered.indexOf(input.currentStage);
    const targetIndex = stagesOrdered.indexOf(milestoneTarget);
    const isMilestoneStageReached = currentIndex >= (targetIndex !== -1 ? targetIndex : 4);
    const isShortlistMilestoneReached = !!input.shortlistSubmittedDate || isMilestoneStageReached;

    // Check if role is filled / completed
    const isCompleted = input.status === 'FILLED' || input.currentStage === 'HIRED_FILLED';

    // Check paused state
    const isPaused = input.status === 'ON_HOLD' && input.pauseOnHold === true;

    // Check cancelled
    const isCancelled = input.status === 'CANCELLED' || input.currentStage === 'CANCELLED';

    // Elapsed calculation
    let effectiveNow = now;
    if (isCompleted && input.shortlistSubmittedDate) {
      effectiveNow = input.shortlistSubmittedDate;
    }

    const elapsedDurationHours = isWorkingDays
      ? calculateWorkingHours(input.slaStartDate, effectiveNow, workingConfig)
      : calculateCalendarHours(input.slaStartDate, effectiveNow);

    const remainingDurationHours = Math.max(0, Math.round((totalDurationHours - elapsedDurationHours) * 100) / 100);

    // Percentage of SLA consumed
    let consumptionPercentage = 0;
    if (totalDurationHours > 0) {
      consumptionPercentage = Math.round((elapsedDurationHours / totalDurationHours) * 10000) / 100;
    } else if (effectiveNow > input.slaDeadlineDate) {
      consumptionPercentage = 100;
    }

    // Determine status
    let slaStatus: 'ON_TRACK' | 'AMBER' | 'RED' | 'BREACHED' | 'COMPLETED' | 'PAUSED' = 'ON_TRACK';
    const isBreached = now > input.slaDeadlineDate && !isShortlistMilestoneReached && !isCompleted;

    if (isCompleted) {
      slaStatus = 'COMPLETED';
    } else if (isCancelled) {
      slaStatus = 'COMPLETED';
    } else if (isPaused) {
      slaStatus = 'PAUSED';
    } else if (isBreached) {
      slaStatus = 'BREACHED';
    } else if (consumptionPercentage >= 90.0) {
      // RULE 2 - RED SLA WARNING (>= 90% consumed)
      slaStatus = 'RED';
    } else if (consumptionPercentage >= 70.0 && !isShortlistMilestoneReached) {
      // RULE 1 - AMBER SLA WARNING (>= 70% consumed and shortlist milestone NOT completed)
      slaStatus = 'AMBER';
    } else {
      slaStatus = 'ON_TRACK';
    }

    return {
      roleId: input.roleId,
      roleTitle: input.roleTitle,
      clientName: input.clientName,
      recruiterName: input.recruiterName,
      priority: input.priority,
      status: input.status,
      currentStage: input.currentStage,
      requestReceivedDate: input.requestReceivedDate.toISOString(),
      slaStartDate: input.slaStartDate.toISOString(),
      slaDeadlineDate: input.slaDeadlineDate.toISOString(),
      deadlinePolicy: input.deadlinePolicy,
      totalDurationHours: Math.round(totalDurationHours * 100) / 100,
      elapsedDurationHours: Math.round(elapsedDurationHours * 100) / 100,
      remainingDurationHours,
      consumptionPercentage,
      slaStatus,
      isShortlistMilestoneReached,
      shortlistSubmittedDate: input.shortlistSubmittedDate ? input.shortlistSubmittedDate.toISOString() : null,
      isBreached
    };
  }
}

export const slaEngine = new SlaClockEngine();

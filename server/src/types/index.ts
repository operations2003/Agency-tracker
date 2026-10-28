import { Request } from 'express';

export type UserRole = 'OWNER' | 'MANAGER' | 'RECRUITER' | 'FINANCE';

export type BillingModel = 'RETAINER' | 'HOURLY' | 'PER_HIRE';

export type DeadlinePolicy = 'CALENDAR_DAYS' | 'WORKING_DAYS';

export type RoleStatus = 'OPEN' | 'ON_HOLD' | 'FILLED' | 'CANCELLED';

export type PipelineStage = 
  | 'NEW_REQUEST'
  | 'SOURCING'
  | 'SCREENING'
  | 'SHORTLISTING'
  | 'SHORTLIST_SUBMITTED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED_FILLED'
  | 'ON_HOLD'
  | 'CANCELLED';

export type TimeEntryStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export type RecruiterCostType = 'HOURLY' | 'SALARIED';

export type AlertType = 'AMBER_SLA' | 'RED_SLA' | 'LOW_MARGIN' | 'RECRUITER_OVERLOAD';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  assignedClientIds: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface MarginCalculationResult {
  clientId: string;
  clientName: string;
  clientCode: string;
  billingModel: BillingModel;
  periodStart: string;
  periodEnd: string;
  currency: string;
  retainerRevenue: number;
  hourlyRevenue: number;
  perHireRevenue: number;
  adjustmentsRevenue: number;
  totalRevenue: number;
  directCost: number;
  directLaborCost: number;
  directOtherCost: number;
  profit: number;
  profitMarginPercentage: number | null; // null if revenue is 0
  marginStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'NO_REVENUE_DEFICIT' | 'NO_ACTIVITY';
  warningThreshold: number;
  isBelowThreshold: boolean;
  isProvisional: boolean;
  unapprovedHours: number;
  approvedHours: number;
}

export interface SlaCalculationResult {
  roleId: string;
  roleTitle: string;
  clientName: string;
  recruiterName: string | null;
  priority: string;
  status: RoleStatus;
  currentStage: PipelineStage;
  requestReceivedDate: string;
  slaStartDate: string;
  slaDeadlineDate: string;
  deadlinePolicy: DeadlinePolicy;
  totalDurationHours: number;
  elapsedDurationHours: number;
  remainingDurationHours: number;
  consumptionPercentage: number;
  slaStatus: 'ON_TRACK' | 'AMBER' | 'RED' | 'BREACHED' | 'COMPLETED' | 'PAUSED';
  isShortlistMilestoneReached: boolean;
  shortlistSubmittedDate: string | null;
  isBreached: boolean;
}

export interface RecruiterWorkloadResult {
  recruiterId: string;
  recruiterName: string;
  email: string;
  openRoleCount: number;
  rolesByStage: Record<PipelineStage, number>;
  approvedHoursThisWeek: number;
  submittedHoursThisWeek: number;
  totalRecordedHoursThisWeek: number;
  weeklyCapacityHours: number;
  utilizationPercentage: number;
  isOverloadedByRoles: boolean;
  isOverloadedByHours: boolean;
  isOverloaded: boolean;
  clientDistribution: Array<{ clientId: string; clientName: string; roleCount: number }>;
  upcomingDeadlines: Array<{ roleId: string; title: string; clientName: string; deadline: string; slaStatus: string }>;
}


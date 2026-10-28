export type UserRole = 'OWNER' | 'MANAGER' | 'RECRUITER' | 'FINANCE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  title?: string;
  organizationName?: string;
  assignedClientIds: string[];
  assignedClients?: Array<{ id: string; name: string; code: string }>;
  currentCostProfile?: any;
}

export interface Client {
  id: string;
  name: string;
  code: string;
  status: string;
  billingModel: 'RETAINER' | 'HOURLY' | 'PER_HIRE';
  currency: string;
  timeZone: string;
  marginWarningThreshold: number;
  deadlinePolicy: 'WORKING_DAYS' | 'CALENDAR_DAYS';
  notes?: string;
  activeContractTerm?: {
    billingModel: string;
    billingRate: number;
    currency: string;
    effectiveFrom: string;
    slaPenaltyPercentage?: number;
  };
  slaPolicy?: {
    defaultTargetDays: number;
    deadlinePolicy: string;
    pauseOnHold: boolean;
    shortlistStageTarget?: string;
  };
  assignedUsers?: Array<{ id: string; name: string; email: string; role: string }>;
  openRolesCount?: number;
  createdAt: string;
}

export interface RecruitmentRole {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  recruiter?: { id: string; name: string; email: string };
  manager?: { id: string; name: string; email: string };
  priority: string;
  status: 'OPEN' | 'ON_HOLD' | 'FILLED' | 'CANCELLED';
  currentStage: string;
  requestReceivedDate: string;
  slaStartDate: string;
  slaDeadlineDate: string;
  deadlinePolicy: string;
  shortlistSubmittedDate?: string | null;
  filledDate?: string | null;
  isBreached: boolean;
  slaEvaluation?: {
    consumptionPercentage: number;
    slaStatus: 'ON_TRACK' | 'AMBER' | 'RED' | 'BREACHED' | 'COMPLETED' | 'PAUSED';
    remainingDurationHours: number;
    elapsedDurationHours: number;
    totalDurationHours: number;
    isShortlistMilestoneReached: boolean;
    isBreached: boolean;
  };
  timeEntriesCount?: number;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  recruiterId: string;
  recruiter?: { id: string; name: string; email: string };
  clientId: string;
  client?: { id: string; name: string; code: string };
  roleId?: string;
  role?: { id: string; title: string };
  taskType: string;
  workDate: string;
  hours: number;
  isBillable: boolean;
  description?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  reviewedBy?: { id: string; name: string };
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface MarginResult {
  clientId: string;
  clientName: string;
  clientCode: string;
  billingModel: 'RETAINER' | 'HOURLY' | 'PER_HIRE';
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
  profitMarginPercentage: number | null;
  marginStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'NO_REVENUE_DEFICIT' | 'NO_ACTIVITY';
  warningThreshold: number;
  isBelowThreshold: boolean;
  isProvisional: boolean;
  unapprovedHours: number;
  approvedHours: number;
}

export interface Alert {
  id: string;
  type: 'AMBER_SLA' | 'RED_SLA' | 'LOW_MARGIN' | 'RECRUITER_OVERLOAD';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  clientId?: string;
  client?: { id: string; name: string; code: string };
  roleId?: string;
  role?: { id: string; title: string };
  recruiterId?: string;
  triggerRule: string;
  thresholdValue?: number;
  actualValue?: number;
  message: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: { id: string; name: string };
  resolutionNotes?: string;
}

export interface RecruiterWorkload {
  recruiterId: string;
  recruiterName: string;
  email: string;
  openRoleCount: number;
  rolesByStage: Record<string, number>;
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

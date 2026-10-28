import { PipelineStage, RecruiterWorkloadResult } from '../types';

export interface RecruiterWorkloadInput {
  recruiterId: string;
  recruiterName: string;
  email: string;
  weeklyCapacityHours?: number;
  maxOpenRolesThreshold: number;
  maxWeeklyHoursThreshold: number;
  roles: Array<{
    id: string;
    title: string;
    clientId: string;
    clientName: string;
    status: string;
    currentStage: PipelineStage;
    slaDeadline: Date;
    slaStatus: string;
  }>;
  timeEntriesThisWeek: Array<{
    hours: number;
    status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    clientId: string;
    clientName: string;
  }>;
}

export class RecruiterWorkloadEngine {
  public calculateWorkload(input: RecruiterWorkloadInput): RecruiterWorkloadResult {
    const weeklyCapacityHours = input.weeklyCapacityHours !== undefined ? input.weeklyCapacityHours : 40.0;
    const activeRoles = input.roles.filter(r => r.status === 'OPEN');
    const openRoleCount = activeRoles.length;

    // Active roles by stage
    const rolesByStage: Record<PipelineStage, number> = {
      NEW_REQUEST: 0,
      SOURCING: 0,
      SCREENING: 0,
      SHORTLISTING: 0,
      SHORTLIST_SUBMITTED: 0,
      INTERVIEW: 0,
      OFFER: 0,
      HIRED_FILLED: 0,
      ON_HOLD: 0,
      CANCELLED: 0
    };

    activeRoles.forEach(r => {
      if (rolesByStage[r.currentStage] !== undefined) {
        rolesByStage[r.currentStage]++;
      }
    });

    // Hours this week
    let approvedHoursThisWeek = 0;
    let submittedHoursThisWeek = 0;

    input.timeEntriesThisWeek.forEach(entry => {
      if (entry.status === 'APPROVED') {
        approvedHoursThisWeek += entry.hours;
      } else if (entry.status === 'SUBMITTED') {
        submittedHoursThisWeek += entry.hours;
      }
    });

    approvedHoursThisWeek = Math.round(approvedHoursThisWeek * 100) / 100;
    submittedHoursThisWeek = Math.round(submittedHoursThisWeek * 100) / 100;
    const totalRecordedHoursThisWeek = Math.round((approvedHoursThisWeek + submittedHoursThisWeek) * 100) / 100;

    // Utilization % = (total recorded hours / capacity) * 100
    let utilizationPercentage = 0;
    if (weeklyCapacityHours > 0) {
      utilizationPercentage = Math.round((totalRecordedHoursThisWeek / weeklyCapacityHours) * 10000) / 100;
    }

    // Overload evaluations
    const isOverloadedByRoles = openRoleCount > input.maxOpenRolesThreshold;
    const isOverloadedByHours = totalRecordedHoursThisWeek > input.maxWeeklyHoursThreshold;
    const isOverloaded = isOverloadedByRoles || isOverloadedByHours;

    // Client distribution
    const clientMap = new Map<string, { clientId: string; clientName: string; roleCount: number }>();
    activeRoles.forEach(r => {
      const existing = clientMap.get(r.clientId) || { clientId: r.clientId, clientName: r.clientName, roleCount: 0 };
      existing.roleCount++;
      clientMap.set(r.clientId, existing);
    });
    const clientDistribution = Array.from(clientMap.values()).sort((a, b) => b.roleCount - a.roleCount);

    // Upcoming deadlines sorted
    const upcomingDeadlines = activeRoles
      .sort((a, b) => a.slaDeadline.getTime() - b.slaDeadline.getTime())
      .slice(0, 5)
      .map(r => ({
        roleId: r.id,
        title: r.title,
        clientName: r.clientName,
        deadline: r.slaDeadline.toISOString(),
        slaStatus: r.slaStatus
      }));

    return {
      recruiterId: input.recruiterId,
      recruiterName: input.recruiterName,
      email: input.email,
      openRoleCount,
      rolesByStage,
      approvedHoursThisWeek,
      submittedHoursThisWeek,
      totalRecordedHoursThisWeek,
      weeklyCapacityHours,
      utilizationPercentage,
      isOverloadedByRoles,
      isOverloadedByHours,
      isOverloaded,
      clientDistribution,
      upcomingDeadlines
    };
  }
}

export const workloadEngine = new RecruiterWorkloadEngine();

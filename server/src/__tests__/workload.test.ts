import { describe, it, expect } from 'vitest';
import { workloadEngine } from '../services/workload.service';

describe('Recruiter Workload Engine', () => {
  it('calculates open role counts and hours accurately', () => {
    const result = workloadEngine.calculateWorkload({
      recruiterId: 'rec-1',
      recruiterName: 'Elena Rostova',
      email: 'elena@agency.io',
      weeklyCapacityHours: 40.0,
      maxOpenRolesThreshold: 8,
      maxWeeklyHoursThreshold: 45.0,
      roles: [
        { id: '1', title: 'Eng 1', clientId: 'c1', clientName: 'Client 1', status: 'OPEN', currentStage: 'SOURCING', slaDeadline: new Date(), slaStatus: 'ON_TRACK' },
        { id: '2', title: 'Eng 2', clientId: 'c1', clientName: 'Client 1', status: 'OPEN', currentStage: 'INTERVIEW', slaDeadline: new Date(), slaStatus: 'ON_TRACK' },
        { id: '3', title: 'Eng 3', clientId: 'c2', clientName: 'Client 2', status: 'FILLED', currentStage: 'HIRED_FILLED', slaDeadline: new Date(), slaStatus: 'COMPLETED' }
      ],
      timeEntriesThisWeek: [
        { hours: 15.0, status: 'APPROVED', clientId: 'c1', clientName: 'Client 1' },
        { hours: 10.0, status: 'APPROVED', clientId: 'c2', clientName: 'Client 2' },
        { hours: 5.0, status: 'SUBMITTED', clientId: 'c1', clientName: 'Client 1' }
      ]
    });

    expect(result.openRoleCount).toBe(2);
    expect(result.approvedHoursThisWeek).toBe(25.0);
    expect(result.submittedHoursThisWeek).toBe(5.0);
    expect(result.totalRecordedHoursThisWeek).toBe(30.0);
    expect(result.utilizationPercentage).toBe(75.0);
    expect(result.isOverloaded).toBe(false);
  });

  it('triggers overload when open roles exceed maxOpenRolesThreshold', () => {
    const roles = Array.from({ length: 9 }).map((_, i) => ({
      id: `r-${i}`,
      title: `Role ${i}`,
      clientId: 'c1',
      clientName: 'Client 1',
      status: 'OPEN',
      currentStage: 'SOURCING' as const,
      slaDeadline: new Date(),
      slaStatus: 'ON_TRACK'
    }));

    const result = workloadEngine.calculateWorkload({
      recruiterId: 'rec-2',
      recruiterName: 'David Kim',
      email: 'david@agency.io',
      weeklyCapacityHours: 40.0,
      maxOpenRolesThreshold: 8,
      maxWeeklyHoursThreshold: 45.0,
      roles,
      timeEntriesThisWeek: [{ hours: 20.0, status: 'APPROVED', clientId: 'c1', clientName: 'Client 1' }]
    });

    expect(result.openRoleCount).toBe(9);
    expect(result.isOverloadedByRoles).toBe(true);
    expect(result.isOverloadedByHours).toBe(false);
    expect(result.isOverloaded).toBe(true);
  });

  it('triggers overload when weekly hours exceed maxWeeklyHoursThreshold', () => {
    const result = workloadEngine.calculateWorkload({
      recruiterId: 'rec-3',
      recruiterName: 'Sarah Jenkins',
      email: 'sarah@agency.io',
      weeklyCapacityHours: 40.0,
      maxOpenRolesThreshold: 8,
      maxWeeklyHoursThreshold: 45.0,
      roles: [],
      timeEntriesThisWeek: [
        { hours: 30.0, status: 'APPROVED', clientId: 'c1', clientName: 'Client 1' },
        { hours: 18.0, status: 'SUBMITTED', clientId: 'c1', clientName: 'Client 1' }
      ]
    });

    expect(result.totalRecordedHoursThisWeek).toBe(48.0);
    expect(result.isOverloadedByHours).toBe(true);
    expect(result.isOverloadedByRoles).toBe(false);
    expect(result.isOverloaded).toBe(true);
    expect(result.utilizationPercentage).toBe(120.0);
  });

  it('handles zero capacity safely without divide-by-zero errors', () => {
    const result = workloadEngine.calculateWorkload({
      recruiterId: 'rec-4',
      recruiterName: 'Zero Cap',
      email: 'zero@agency.io',
      weeklyCapacityHours: 0,
      maxOpenRolesThreshold: 8,
      maxWeeklyHoursThreshold: 45.0,
      roles: [],
      timeEntriesThisWeek: [{ hours: 5.0, status: 'APPROVED', clientId: 'c1', clientName: 'Client 1' }]
    });

    expect(result.utilizationPercentage).toBe(0);
  });
});

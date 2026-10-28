import { describe, it, expect } from 'vitest';
import { alertEngine } from '../services/alert.service';

describe('Alert Engine & Deduplication', () => {
  it('generates a stable, reproducible deduplication key', () => {
    const key1 = alertEngine.generateDeduplicationKey('AMBER_SLA', 'role-123', '70pct', '2026-10-28');
    const key2 = alertEngine.generateDeduplicationKey('AMBER_SLA', 'role-123', '70pct', '2026-10-28');
    const keyDiff = alertEngine.generateDeduplicationKey('AMBER_SLA', 'role-124', '70pct', '2026-10-28');

    expect(key1).toBe('AMBER_SLA:role-123:70pct:2026-10-28');
    expect(key1).toBe(key2);
    expect(key1).not.toBe(keyDiff);
  });

  it('triggers Rule 1 Amber warning when consumption >= 70% and shortlist incomplete', () => {
    const alert = alertEngine.evaluateRule1AmberSla({
      roleId: 'r-1',
      roleTitle: 'Fullstack Dev',
      clientName: 'Acme',
      clientId: 'c-1',
      consumptionPercentage: 75.0,
      thresholdPercentage: 70.0,
      isShortlistMilestoneReached: false
    });

    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('AMBER_SLA');
    expect(alert?.severity).toBe('WARNING');
    expect(alert?.actualValue).toBe(75.0);
  });

  it('does NOT trigger Rule 1 if shortlist milestone is completed', () => {
    const alert = alertEngine.evaluateRule1AmberSla({
      roleId: 'r-1',
      roleTitle: 'Fullstack Dev',
      clientName: 'Acme',
      clientId: 'c-1',
      consumptionPercentage: 85.0,
      thresholdPercentage: 70.0,
      isShortlistMilestoneReached: true
    });

    expect(alert).toBeNull();
  });

  it('triggers Rule 2 Red warning when consumption >= 90%', () => {
    const alert = alertEngine.evaluateRule2RedSla({
      roleId: 'r-2',
      roleTitle: 'DevOps Lead',
      clientName: 'Acme',
      clientId: 'c-1',
      consumptionPercentage: 92.0,
      thresholdPercentage: 90.0,
      isBreached: false
    });

    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('RED_SLA');
    expect(alert?.severity).toBe('CRITICAL');
  });

  it('triggers Rule 3 Low Margin warning when margin is below threshold', () => {
    const alert = alertEngine.evaluateRule3LowMargin({
      clientId: 'c-1',
      clientName: 'Acme',
      profitMarginPercentage: 14.5,
      marginThreshold: 20.0,
      reportingPeriodStr: '2026-10'
    });

    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('LOW_MARGIN');
    expect(alert?.actualValue).toBe(14.5);
  });

  it('triggers Rule 4 Recruiter Overload when hours or roles exceeded', () => {
    const alert = alertEngine.evaluateRule4RecruiterOverload({
      recruiterId: 'rec-1',
      recruiterName: 'David Kim',
      openRoleCount: 10,
      maxOpenRolesThreshold: 8,
      weeklyHours: 42.0,
      maxWeeklyHoursThreshold: 45.0,
      weekStr: '2026-W44'
    });

    expect(alert).not.toBeNull();
    expect(alert?.type).toBe('RECRUITER_OVERLOAD');
    expect(alert?.severity).toBe('WARNING');
  });
});


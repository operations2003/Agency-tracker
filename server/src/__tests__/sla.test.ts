import { describe, it, expect } from 'vitest';
import { slaEngine } from '../services/sla.service';
import { calculateWorkingHours, calculateCalendarHours, isNonWorkingDay } from '../utils/date-utils';

describe('SLA Clock and Risk Engine', () => {
  describe('Working-Day and Holiday Calendar Math', () => {
    it('identifies weekends and configured holidays correctly', () => {
      // 2026-10-24 is Saturday, 2026-10-25 is Sunday, 2026-10-26 is Monday
      const saturday = new Date('2026-10-24T12:00:00Z');
      const sunday = new Date('2026-10-25T12:00:00Z');
      const monday = new Date('2026-10-26T12:00:00Z');

      expect(isNonWorkingDay(saturday)).toBe(true);
      expect(isNonWorkingDay(sunday)).toBe(true);
      expect(isNonWorkingDay(monday)).toBe(false);

      // With holiday configuration
      expect(isNonWorkingDay(monday, ['2026-10-26'])).toBe(true);
    });

    it('calculates calendar hours 24/7', () => {
      const start = new Date('2026-10-01T00:00:00Z');
      const end = new Date('2026-10-03T12:00:00Z'); // 2.5 days = 60 hours
      const hours = calculateCalendarHours(start, end);
      expect(hours).toBe(60);
    });
  });

  describe('SLA Threshold Rules & Warning Triggers', () => {
    it('triggers RULE 1 — AMBER SLA WARNING when >= 70% consumed without shortlist', () => {
      const start = new Date('2026-10-01T09:00:00Z');
      const deadline = new Date('2026-10-11T09:00:00Z'); // 10 days = 240 calendar hours
      // Now at 75% elapsed (7.5 days = 180 hours)
      const now = new Date('2026-10-08T12:00:00Z');

      const result = slaEngine.evaluateRoleSla({
        roleId: 'role-1',
        roleTitle: 'Senior Cloud Engineer',
        clientName: 'Acme Corp',
        recruiterName: 'Alice',
        priority: 'HIGH',
        status: 'OPEN',
        currentStage: 'SOURCING',
        requestReceivedDate: start,
        slaStartDate: start,
        slaDeadlineDate: deadline,
        deadlinePolicy: 'CALENDAR_DAYS',
        shortlistSubmittedDate: null,
        now
      });

      expect(result.consumptionPercentage).toBe(71.25);
      expect(result.slaStatus).toBe('AMBER');
      expect(result.isShortlistMilestoneReached).toBe(false);
    });

    it('does NOT trigger Amber if shortlist milestone was already reached', () => {
      const start = new Date('2026-10-01T09:00:00Z');
      const deadline = new Date('2026-10-11T09:00:00Z');
      const now = new Date('2026-10-08T12:00:00Z'); // 71.25% elapsed

      const result = slaEngine.evaluateRoleSla({
        roleId: 'role-2',
        roleTitle: 'DevOps Lead',
        clientName: 'Acme Corp',
        recruiterName: 'Alice',
        priority: 'HIGH',
        status: 'OPEN',
        currentStage: 'SHORTLIST_SUBMITTED', // reached milestone!
        requestReceivedDate: start,
        slaStartDate: start,
        slaDeadlineDate: deadline,
        deadlinePolicy: 'CALENDAR_DAYS',
        shortlistSubmittedDate: new Date('2026-10-05T10:00:00Z'),
        now
      });

      expect(result.isShortlistMilestoneReached).toBe(true);
      expect(result.slaStatus).toBe('ON_TRACK');
    });

    it('triggers RULE 2 — RED SLA WARNING when >= 90% consumed', () => {
      const start = new Date('2026-10-01T09:00:00Z');
      const deadline = new Date('2026-10-11T09:00:00Z');
      // 9.2 days elapsed (92%)
      const now = new Date('2026-10-10T14:00:00Z');

      const result = slaEngine.evaluateRoleSla({
        roleId: 'role-3',
        roleTitle: 'Frontend Architect',
        clientName: 'Tech Corp',
        recruiterName: 'Bob',
        priority: 'URGENT',
        status: 'OPEN',
        currentStage: 'SOURCING',
        requestReceivedDate: start,
        slaStartDate: start,
        slaDeadlineDate: deadline,
        deadlinePolicy: 'CALENDAR_DAYS',
        shortlistSubmittedDate: null,
        now
      });

      expect(result.consumptionPercentage).toBeGreaterThanOrEqual(90.0);
      expect(result.slaStatus).toBe('RED');
    });

    it('marks role as BREACHED when past contractual deadline without completion', () => {
      const start = new Date('2026-10-01T09:00:00Z');
      const deadline = new Date('2026-10-10T09:00:00Z');
      // Past deadline
      const now = new Date('2026-10-12T09:00:00Z');

      const result = slaEngine.evaluateRoleSla({
        roleId: 'role-4',
        roleTitle: 'QA Lead',
        clientName: 'Tech Corp',
        recruiterName: 'Bob',
        priority: 'MEDIUM',
        status: 'OPEN',
        currentStage: 'SOURCING',
        requestReceivedDate: start,
        slaStartDate: start,
        slaDeadlineDate: deadline,
        deadlinePolicy: 'CALENDAR_DAYS',
        shortlistSubmittedDate: null,
        now
      });

      expect(result.isBreached).toBe(true);
      expect(result.slaStatus).toBe('BREACHED');
    });

    it('respects pause policy when role status is ON_HOLD', () => {
      const start = new Date('2026-10-01T09:00:00Z');
      const deadline = new Date('2026-10-15T09:00:00Z');
      const now = new Date('2026-10-08T09:00:00Z');

      const result = slaEngine.evaluateRoleSla({
        roleId: 'role-5',
        roleTitle: 'Security Engineer',
        clientName: 'Fintech Corp',
        recruiterName: 'Carol',
        priority: 'MEDIUM',
        status: 'ON_HOLD',
        currentStage: 'ON_HOLD',
        requestReceivedDate: start,
        slaStartDate: start,
        slaDeadlineDate: deadline,
        deadlinePolicy: 'CALENDAR_DAYS',
        shortlistSubmittedDate: null,
        pauseOnHold: true,
        now
      });

      expect(result.slaStatus).toBe('PAUSED');
    });
  });
});

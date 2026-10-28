import { describe, it, expect } from 'vitest';
import { marginEngine } from '../services/margin.service';

describe('Margin Calculation Engine', () => {
  const periodStart = new Date('2026-10-01T00:00:00Z');
  const periodEnd = new Date('2026-10-31T00:00:00Z');

  describe('Billing Model Revenue Calculations', () => {
    it('calculates RETAINER model revenue correctly', () => {
      const revenue = marginEngine.calculateRevenue({
        clientId: 'c1',
        clientName: 'Acme Retainer',
        clientCode: 'ACME',
        billingModel: 'RETAINER',
        currency: 'USD',
        marginWarningThreshold: 20.0,
        periodStart,
        periodEnd,
        retainerMonthlyRate: 15000.0,
        recruiterLaborCosts: []
      });

      // 30 days proration on $15,000 monthly
      expect(revenue.retainerRevenue).toBe(15000.0);
      expect(revenue.totalRevenue).toBe(15000.0);
    });

    it('calculates HOURLY model revenue from approved billable hours', () => {
      const revenue = marginEngine.calculateRevenue({
        clientId: 'c2',
        clientName: 'Tech Hourly',
        clientCode: 'TECH',
        billingModel: 'HOURLY',
        currency: 'USD',
        marginWarningThreshold: 20.0,
        periodStart,
        periodEnd,
        approvedBillableHours: 120.0,
        hourlyBillingRate: 85.0,
        recruiterLaborCosts: []
      });

      // 120 * 85 = 10,200
      expect(revenue.hourlyRevenue).toBe(10200.0);
      expect(revenue.totalRevenue).toBe(10200.0);
    });

    it('calculates PER_HIRE model revenue from confirmed hires', () => {
      const revenue = marginEngine.calculateRevenue({
        clientId: 'c3',
        clientName: 'Direct Placement',
        clientCode: 'DIR',
        billingModel: 'PER_HIRE',
        currency: 'USD',
        marginWarningThreshold: 20.0,
        periodStart,
        periodEnd,
        billableHiresCount: 2,
        perHireFeeRate: 9000.0,
        recruiterLaborCosts: []
      });

      // 2 * 9000 = 18,000
      expect(revenue.perHireRevenue).toBe(18000.0);
      expect(revenue.totalRevenue).toBe(18000.0);
    });

    it('incorporates approved financial adjustments into total revenue', () => {
      const revenue = marginEngine.calculateRevenue({
        clientId: 'c4',
        clientName: 'Adjusted Client',
        clientCode: 'ADJ',
        billingModel: 'RETAINER',
        currency: 'USD',
        marginWarningThreshold: 20.0,
        periodStart,
        periodEnd,
        retainerMonthlyRate: 10000.0,
        financialAdjustmentsAmount: -1500.0, // e.g. SLA penalty credit
        recruiterLaborCosts: []
      });

      expect(revenue.totalRevenue).toBe(8500.0);
    });
  });

  describe('Direct Recruiter Labor Cost Calculations', () => {
    it('calculates HOURLY labor cost including optional employer overhead', () => {
      const cost = marginEngine.calculateLaborCost({
        hours: 40.0,
        costType: 'HOURLY',
        hourlyRate: 50.0,
        overheadMultiplier: 0.15 // 15% employer overhead
      });

      // 40 * 50 * 1.15 = 2,300
      expect(cost).toBe(2300.0);
    });

    it('calculates SALARIED labor cost using documented working-hour allocation', () => {
      const cost = marginEngine.calculateLaborCost({
        hours: 20.0,
        costType: 'SALARIED',
        monthlySalary: 6933.33,
        standardWeeklyHours: 40, // monthly hours = 40 * 4.333333 = 173.33 -> hourly cost = $40.0
        overheadMultiplier: 0.10 // 10% overhead -> $44.0/hr
      });

      // 20 * 40 * 1.1 = 880
      expect(Math.round(cost)).toBe(880);
    });
  });

  describe('Profit and Profit Margin Formulas', () => {
    it('computes Profit = Revenue - Direct Cost and Margin %', () => {
      const result = marginEngine.calculateClientMargin({
        clientId: 'c1',
        clientName: 'Acme',
        clientCode: 'ACME',
        billingModel: 'RETAINER',
        currency: 'USD',
        marginWarningThreshold: 20.0,
        periodStart,
        periodEnd,
        retainerMonthlyRate: 10000.0,
        recruiterLaborCosts: [
          {
            recruiterId: 'r1',
            recruiterName: 'Alice',
            hours: 80,
            costType: 'HOURLY',
            calculatedCost: 4000.0
          }
        ],
        otherDirectCosts: 1000.0
      });

      expect(result.totalRevenue).toBe(10000.0);
      expect(result.directCost).toBe(5000.0);
      expect(result.profit).toBe(5000.0);
      expect(result.profitMarginPercentage).toBe(50.0);
      expect(result.marginStatus).toBe('HEALTHY');
      expect(result.isBelowThreshold).toBe(false);
    });

    it('flags client below the 20% margin warning threshold', () => {
      const result = marginEngine.calculateClientMargin({
        clientId: 'c2',
        clientName: 'Low Margin Account',
        clientCode: 'LMA',
        billingModel: 'RETAINER',
        currency: 'USD',
        marginWarningThreshold: 20.0,
        periodStart,
        periodEnd,
        retainerMonthlyRate: 10000.0,
        recruiterLaborCosts: [
          {
            recruiterId: 'r1',
            recruiterName: 'Alice',
            hours: 150,
            costType: 'HOURLY',
            calculatedCost: 8500.0
          }
        ]
      });

      expect(result.profit).toBe(1500.0);
      expect(result.profitMarginPercentage).toBe(15.0);
      expect(result.isBelowThreshold).toBe(true);
      expect(result.marginStatus).toBe('WARNING');
    });

    it('handles zero revenue safely without division by zero', () => {
      const result = marginEngine.calculateClientMargin({
        clientId: 'c3',
        clientName: 'Inactive Account',
        clientCode: 'INA',
        billingModel: 'HOURLY',
        currency: 'USD',
        marginWarningThreshold: 20.0,
        periodStart,
        periodEnd,
        approvedBillableHours: 0,
        hourlyBillingRate: 100.0,
        recruiterLaborCosts: [
          {
            recruiterId: 'r1',
            recruiterName: 'Bob',
            hours: 10,
            costType: 'HOURLY',
            calculatedCost: 500.0
          }
        ]
      });

      expect(result.totalRevenue).toBe(0);
      expect(result.directCost).toBe(500.0);
      expect(result.profit).toBe(-500.0);
      expect(result.profitMarginPercentage).toBeNull();
      expect(result.marginStatus).toBe('NO_REVENUE_DEFICIT');
    });
  });
});


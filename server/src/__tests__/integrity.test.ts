import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../db';
import { csvService } from '../services/csv.service';


describe('Data Integrity & Constraint Enforcement', () => {
  let clientId: string;
  let roleId: string;

  beforeEach(async () => {
    // Setup test organization and client
    const org = await prisma.organization.upsert({
      where: { id: 'org-test-integrity' },
      update: {},
      create: {
        id: 'org-test-integrity',
        name: 'Integrity Test Agency',
        slug: 'integrity-agency',
      },
    });


    const client = await prisma.client.upsert({
      where: { code: 'TEST_INTEGRITY' },
      update: {},
      create: {
        organizationId: org.id,
        code: 'TEST_INTEGRITY',
        name: 'Integrity Corp',
        billingModel: 'PER_HIRE',
        currency: 'USD',
      },
    });
    clientId = client.id;

    // Clean existing test hires and invoices
    await prisma.billableHire.deleteMany({ where: { clientId } });
    await prisma.invoice.deleteMany({ where: { clientId } });

    const role = await prisma.recruitmentRole.findFirst({ where: { clientId } });
    if (role) {
      roleId = role.id;
    } else {
      const newRole = await prisma.recruitmentRole.create({
        data: {
          clientId,
          title: 'Senior Reliability Engineer',
          slaDeadlineDate: new Date(Date.now() + 14 * 86400000),
        },
      });

      roleId = newRole.id;
    }
  });

  it('enforces unique invoice number constraint across clients', async () => {
    const invNum = `INV-UNIQUE-${Date.now()}`;

    // First invoice should succeed
    await prisma.invoice.create({
      data: {
        clientId,
        invoiceNumber: invNum,
        amount: 5000.0,
        currency: 'USD',
        status: 'PAID',
        periodStart: new Date(),
        periodEnd: new Date(),
      },
    });

    // Duplicate invoiceNumber should be rejected by database unique constraint
    await expect(
      prisma.invoice.create({
        data: {
          clientId,
          invoiceNumber: invNum,
          amount: 5000.0,
          currency: 'USD',
          status: 'ISSUED',
          periodStart: new Date(),
          periodEnd: new Date(),
        },
      })
    ).rejects.toThrow();
  });

  it('prevents duplicate placement fee for the same candidate, client and role', async () => {
    const candidateName = 'Alice Candidate';

    // First billable placement succeeds
    await prisma.billableHire.create({
      data: {
        clientId,
        roleId,
        candidateName,
        feeAmount: 8500.0,
        currency: 'USD',
        hireDate: new Date(),
      },
    });

    // Duplicate placement fee for same candidate on same role must be rejected
    await expect(
      prisma.billableHire.create({
        data: {
          clientId,
          roleId,
          candidateName,
          feeAmount: 8500.0,
          currency: 'USD',
          hireDate: new Date(),
        },
      })
    ).rejects.toThrow();

  });

  it('validates CSV edge cases and flags duplicates in import preview', () => {
    const duplicateInvoiceCsv = `clientCode,invoiceNumber,periodStart,periodEnd,amount,currency,status
ACME,INV-2026-001,2026-10-01,2026-10-31,10000,USD,ISSUED
ACME,INV-2026-001,2026-10-01,2026-10-31,10000,USD,ISSUED`;

    const preview = csvService.previewCsv('BILLING', duplicateInvoiceCsv);
    expect(preview.errors.length).toBeGreaterThan(0);
    expect(preview.errors.some(e => e.message.includes('Duplicate invoiceNumber'))).toBe(true);
  });

  it('rejects CSV files exceeding file size or row limits', () => {
    // Generate oversized rows
    let hugeCsv = 'clientCode,invoiceNumber,periodStart,periodEnd,amount,currency,status\n';
    for (let i = 0; i <= 5001; i++) {
      hugeCsv += `ACME,INV-${i},2026-10-01,2026-10-31,1000,USD,ISSUED\n`;
    }

    const preview = csvService.previewCsv('BILLING', hugeCsv);
    expect(preview.errors.length).toBeGreaterThan(0);
    expect(preview.errors[0].field).toBe('row_limit');
  });
});

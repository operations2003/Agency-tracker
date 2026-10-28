import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import prisma from '../db';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';


export type CsvEntityType = 'CLIENTS' | 'RECRUITERS' | 'ROLES' | 'TIME_ENTRIES' | 'BILLING';

export interface CsvPreviewResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{
    rowNumber: number;
    field: string;
    message: string;
    rawData?: string;
  }>;
  previewData: any[];
  allRecords: any[];
}

export const CSV_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const CSV_MAX_ROW_COUNT = 5000;

export class CsvService {
  /**
   * Generates downloadable CSV template with standard headers and sample data
   */
  public getTemplate(entityType: CsvEntityType): string {
    switch (entityType) {
      case 'CLIENTS':
        return stringify([
          ['code', 'name', 'billingModel', 'billingRate', 'currency', 'timeZone', 'marginWarningThreshold', 'deadlinePolicy', 'notes'],
          ['ACME', 'Acme Corporation', 'RETAINER', '12000.00', 'USD', 'America/New_York', '20.0', 'WORKING_DAYS', 'Tier-1 enterprise retainer'],
          ['NEXUS', 'Nexus Tech Ltd', 'HOURLY', '95.00', 'USD', 'America/Chicago', '25.0', 'WORKING_DAYS', 'Hourly specialized engineering talent'],
          ['VORTEX', 'Vortex Staffing', 'PER_HIRE', '8500.00', 'USD', 'America/Los_Angeles', '20.0', 'CALENDAR_DAYS', 'Contingency per placement fee']
        ]);

      case 'RECRUITERS':
        return stringify([
          ['name', 'email', 'costType', 'hourlyRate', 'monthlySalary', 'standardWeeklyHours', 'overheadMultiplier', 'title'],
          ['Sarah Jenkins', 'sarah.jenkins@agency.io', 'HOURLY', '45.00', '', '40', '0.15', 'Senior Technical Recruiter'],
          ['David Kim', 'david.kim@agency.io', 'SALARIED', '', '7500.00', '40', '0.20', 'Executive Talent Lead'],
          ['Elena Rostova', 'elena.r@agency.io', 'HOURLY', '38.00', '', '35', '0.10', 'Talent Sourcer']
        ]);

      case 'ROLES':
        return stringify([
          ['clientCode', 'title', 'priority', 'targetDays', 'deadlinePolicy', 'description'],
          ['ACME', 'Principal Distributed Systems Architect', 'HIGH', '14', 'WORKING_DAYS', 'Lead cloud infrastructure design'],
          ['NEXUS', 'Senior Fullstack TypeScript Engineer', 'MEDIUM', '21', 'WORKING_DAYS', 'Frontend React & backend Node.js microservices'],
          ['VORTEX', 'Director of Product Design', 'URGENT', '10', 'CALENDAR_DAYS', 'Lead design system & mobile UX']
        ]);

      case 'TIME_ENTRIES':
        return stringify([
          ['recruiterEmail', 'clientCode', 'roleTitle', 'taskType', 'workDate', 'hours', 'isBillable', 'description'],
          ['sarah.jenkins@agency.io', 'ACME', 'Principal Distributed Systems Architect', 'SOURCING', '2026-10-26', '3.5', 'true', 'Direct sourcing on GitHub & LinkedIn'],
          ['david.kim@agency.io', 'NEXUS', 'Senior Fullstack TypeScript Engineer', 'INTERVIEW', '2026-10-26', '2.0', 'true', 'Technical screening interviews']
        ]);

      case 'BILLING':
        return stringify([
          ['clientCode', 'invoiceNumber', 'periodStart', 'periodEnd', 'amount', 'currency', 'status'],
          ['ACME', 'INV-2026-001', '2026-10-01', '2026-10-31', '12000.00', 'USD', 'ISSUED'],
          ['NEXUS', 'INV-2026-002', '2026-10-01', '2026-10-15', '7600.00', 'USD', 'PAID']
        ]);
    }
  }

  /**
   * Parses and validates raw CSV content without committing to the database
   */
  public previewCsv(entityType: CsvEntityType, csvContent: string): CsvPreviewResult {
    if (Buffer.byteLength(csvContent, 'utf8') > CSV_MAX_FILE_SIZE_BYTES) {
      return {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [{ rowNumber: 0, field: 'file_size', message: `File exceeds maximum allowed size of 5MB` }],
        previewData: [],
        allRecords: []
      };
    }

    let records: any[] = [];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (err: any) {
      return {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        errors: [{ rowNumber: 1, field: 'csv_format', message: `CSV syntax error: ${err.message}` }],
        previewData: [],
        allRecords: []
      };
    }

    if (records.length > CSV_MAX_ROW_COUNT) {
      return {
        totalRows: records.length,
        validRows: 0,
        invalidRows: records.length,
        errors: [{ rowNumber: 0, field: 'row_limit', message: `File exceeds maximum allowed row count of ${CSV_MAX_ROW_COUNT} rows` }],
        previewData: [],
        allRecords: []
      };
    }

    const errors: CsvPreviewResult['errors'] = [];
    const validData: any[] = [];
    const seenKeys = new Set<string>();

    records.forEach((row, idx) => {
      const rowNum = idx + 2; // account for header
      const rowErrors: string[] = [];

      switch (entityType) {
        case 'CLIENTS':
          if (!row.code || row.code.length < 2) rowErrors.push('Missing or invalid client code');
          if (!row.name) rowErrors.push('Missing client name');
          if (row.billingModel && !['RETAINER', 'HOURLY', 'PER_HIRE'].includes(row.billingModel)) {
            rowErrors.push('Invalid billingModel (must be RETAINER, HOURLY, or PER_HIRE)');
          }
          if (row.billingRate && isNaN(parseFloat(row.billingRate))) {
            rowErrors.push('Billing rate must be a valid numeric value');
          }
          break;

        case 'RECRUITERS':
          if (!row.email || !row.email.includes('@')) rowErrors.push('Missing or invalid email');
          if (!row.name) rowErrors.push('Missing recruiter name');
          if (row.costType && !['HOURLY', 'SALARIED'].includes(row.costType)) {
            rowErrors.push('costType must be HOURLY or SALARIED');
          }
          if (row.costType === 'HOURLY' && (!row.hourlyRate || isNaN(parseFloat(row.hourlyRate)))) {
            rowErrors.push('hourlyRate is required for HOURLY costType');
          }
          if (row.costType === 'SALARIED' && (!row.monthlySalary || isNaN(parseFloat(row.monthlySalary)))) {
            rowErrors.push('monthlySalary is required for SALARIED costType');
          }
          break;

        case 'ROLES':
          if (!row.clientCode) rowErrors.push('Missing clientCode');
          if (!row.title) rowErrors.push('Missing role title');
          if (row.targetDays && isNaN(parseInt(row.targetDays, 10))) {
            rowErrors.push('targetDays must be an integer');
          }
          break;

        case 'TIME_ENTRIES':
          if (!row.recruiterEmail) rowErrors.push('Missing recruiterEmail');
          if (!row.clientCode) rowErrors.push('Missing clientCode');
          if (!row.hours || isNaN(parseFloat(row.hours)) || parseFloat(row.hours) <= 0) {
            rowErrors.push('Hours must be a positive decimal number');
          }
          if (!row.workDate || isNaN(Date.parse(row.workDate))) {
            rowErrors.push('workDate must be a valid ISO date (YYYY-MM-DD)');
          }
          break;

        case 'BILLING':
          if (!row.clientCode) rowErrors.push('Missing clientCode');
          if (!row.invoiceNumber) {
            rowErrors.push('Missing invoiceNumber');
          } else {
            const key = row.invoiceNumber.trim().toUpperCase();
            if (seenKeys.has(key)) {
              rowErrors.push(`Duplicate invoiceNumber in batch: ${key}`);
            } else {
              seenKeys.add(key);
            }
          }
          if (!row.amount || isNaN(parseFloat(row.amount)) || parseFloat(row.amount) < 0) {
            rowErrors.push('Amount must be a non-negative number');
          }
          break;
      }

      if (rowErrors.length > 0) {
        rowErrors.forEach(msg => {
          errors.push({
            rowNumber: rowNum,
            field: 'validation',
            message: msg,
            rawData: JSON.stringify(row)
          });
        });
      } else {
        validData.push(row);
      }
    });

    return {
      totalRows: records.length,
      validRows: validData.length,
      invalidRows: records.length - validData.length,
      errors,
      previewData: records.slice(0, 10),
      allRecords: validData
    };
  }

  /**
   * Generates formatted CSV string for export
   */
  public exportCsv(records: any[]): string {
    if (!records || records.length === 0) {
      return '';
    }
    return stringify(records, { header: true });
  }

  /**
   * Static processor for both background jobs and immediate imports
   */
  public static async processImport(entityType: string, rows: any[], userId: string, organizationId?: string): Promise<{ importedCount: number; errors: any[] }> {
    let importedCount = 0;
    const errors: any[] = [];
    const type = entityType.toUpperCase();

    // Default password for newly imported recruiters
    const defaultHash = await bcrypt.hash('Password123!', 10);

    for (const [idx, row] of rows.entries()) {
      try {
        if (type === 'CLIENTS') {
          const code = row.code.toUpperCase().trim();
          await prisma.client.upsert({
            where: { code },
            update: {
              name: row.name.trim(),
              billingModel: row.billingModel || 'RETAINER',
              marginWarningThreshold: row.marginWarningThreshold ? parseFloat(row.marginWarningThreshold) : 20.0,
            },
            create: {
              organizationId: organizationId || 'org-agency-default',
              name: row.name.trim(),
              code,
              billingModel: row.billingModel || 'RETAINER',
              currency: row.currency || 'USD',
              timeZone: row.timeZone || 'America/New_York',
              marginWarningThreshold: row.marginWarningThreshold ? parseFloat(row.marginWarningThreshold) : 20.0,
              deadlinePolicy: row.deadlinePolicy || 'WORKING_DAYS',
              contractTerms: {
                create: {
                  billingModel: row.billingModel || 'RETAINER',
                  billingRate: row.billingRate ? parseFloat(row.billingRate) : 0,
                  currency: row.currency || 'USD',
                  effectiveFrom: new Date(),
                },
              },
            },
          });
          importedCount++;
        } else if (type === 'RECRUITERS') {
          const email = row.email.toLowerCase().trim();
          const recruiter = await prisma.user.upsert({
            where: { email },
            update: { name: row.name, title: row.title },
            create: {
              organizationId: organizationId || 'org-agency-default',
              email,
              name: row.name,
              role: 'RECRUITER',
              title: row.title || 'Technical Recruiter',
              passwordHash: defaultHash,
            },
          });

          if (row.costType) {
            await prisma.recruiterCostProfile.create({
              data: {
                userId: recruiter.id,
                costType: row.costType,
                hourlyCostRate: row.hourlyRate ? parseFloat(row.hourlyRate) : null,
                monthlySalary: row.monthlySalary ? parseFloat(row.monthlySalary) : null,
                standardWeeklyHours: row.standardWeeklyHours ? parseFloat(row.standardWeeklyHours) : 40.0,
                overheadMultiplier: row.overheadMultiplier ? parseFloat(row.overheadMultiplier) : 0.0,
                effectiveFrom: new Date(),
              },
            });
          }
          importedCount++;
        } else if (type === 'ROLES') {
          const client = await prisma.client.findUnique({ where: { code: row.clientCode.toUpperCase().trim() } });
          if (!client) throw new Error(`Client code ${row.clientCode} not found`);

          await prisma.recruitmentRole.create({
            data: {
              clientId: client.id,
              title: row.title.trim(),
              priority: row.priority || 'MEDIUM',
              deadlinePolicy: row.deadlinePolicy || client.deadlinePolicy,
              description: row.description || '',
              slaDeadlineDate: new Date(Date.now() + (parseInt(row.targetDays, 10) || 14) * 24 * 60 * 60 * 1000),
            },
          });

          importedCount++;
        } else if (type === 'BILLING') {
          const client = await prisma.client.findUnique({ where: { code: row.clientCode.toUpperCase().trim() } });
          if (!client) throw new Error(`Client code ${row.clientCode} not found`);

          await prisma.invoice.create({
            data: {
              clientId: client.id,
              invoiceNumber: row.invoiceNumber.trim().toUpperCase(),
              periodStart: row.periodStart ? new Date(row.periodStart) : new Date(),
              periodEnd: row.periodEnd ? new Date(row.periodEnd) : new Date(),
              amount: parseFloat(row.amount),
              currency: row.currency || client.currency,
              status: row.status || 'ISSUED',
            },
          });
          importedCount++;
        }
      } catch (err: any) {
        errors.push({ rowNumber: idx + 2, error: err.message });
        logger.error(`CSV import row error (row ${idx + 2}): ${err.message}`);
      }
    }

    return { importedCount, errors };
  }
}

export const csvService = new CsvService();
export const CSVService = CsvService;



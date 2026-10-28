import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';

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
}

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
        previewData: []
      };
    }

    const errors: CsvPreviewResult['errors'] = [];
    const validData: any[] = [];

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
          if (!row.invoiceNumber) rowErrors.push('Missing invoiceNumber');
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
      previewData: records.slice(0, 10)
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
}

export const csvService = new CsvService();

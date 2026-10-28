# CSV Import and Ingestion Guide

## Agency SLA and Margin Leakage Tracker

---

### 1. Ingestion Overview
The CSV Import Center (`/csv`) provides streaming schema dry-run checks and atomic transaction commits for:
1. **Clients and Contract Terms** (`CLIENTS`)
2. **Recruiters and Cost Rates** (`RECRUITERS`)
3. **Recruitment Roles and Deadlines** (`ROLES`)
4. **Time Entries** (`TIME_ENTRIES`)
5. **Billing and Invoices** (`BILLING`)

---

### 2. Standard Templates and Field Specifications

#### Clients (`clients_template.csv`)
Headers: `code,name,billingModel,billingRate,currency,timeZone,marginWarningThreshold,deadlinePolicy,notes`
- `code`: Unique uppercase agency client identifier (e.g., `ACME`).
- `name`: Company name.
- `billingModel`: `RETAINER`, `HOURLY`, or `PER_HIRE`.
- `billingRate`: Numeric decimal (monthly retainer, hourly billing rate, or placement fee).
- `currency`: 3-letter currency code (e.g., `USD`, `EUR`, `GBP`).
- `timeZone`: IANA time zone string (e.g., `America/New_York`).
- `marginWarningThreshold`: Percentage below which warnings trigger (default `20.0`).
- `deadlinePolicy`: `WORKING_DAYS` or `CALENDAR_DAYS`.

#### Recruiters (`recruiters_template.csv`)
Headers: `name,email,costType,hourlyRate,monthlySalary,standardWeeklyHours,overheadMultiplier,title`
- `email`: Recruiter login email.
- `costType`: `HOURLY` or `SALARIED`.
- `hourlyRate`: Hourly cost if `HOURLY`.
- `monthlySalary`: Base salary if `SALARIED`.
- `standardWeeklyHours`: Contracted hours (default `40`).
- `overheadMultiplier`: Employer burden percentage (e.g., `0.15` for 15%).

#### Recruitment Roles (`roles_template.csv`)
Headers: `clientCode,title,priority,targetDays,deadlinePolicy,description`
- `clientCode`: Must match existing client code.
- `priority`: `LOW`, `MEDIUM`, `HIGH`, or `URGENT`.
- `targetDays`: Target calendar or working days to fill.

#### Time Entries (`time_entries_template.csv`)
Headers: `recruiterEmail,clientCode,roleTitle,taskType,workDate,hours,isBillable,description`
- `taskType`: `SOURCING`, `SCREENING`, `CANDIDATE_CALL`, `INTERVIEW`, `CLIENT_MEETING`, `COORDINATION`, `REPORTING`, or `OTHER`.
- `workDate`: `YYYY-MM-DD`.
- `hours`: Positive decimal number between `0.1` and `24.0`.
- `isBillable`: `true` or `false`.

---

### 3. Pre-Import Validation & Error Reporting
- The importer validates row data before database insertion.
- If any line fails validation, detailed line numbers and specific error reasons are surfaced without corrupting existing records.
- All operations are idempotent; existing client codes and user emails are safely updated rather than duplicated.


# Agency SLA and Margin Leakage Tracker

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-informational.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-33%20Passed%20(100%25)-emerald.svg)]()

> A production-oriented web application designed for HR, recruitment, and staffing agencies to prevent silent margin leakage, monitor client SLA deadlines, and balance recruiter workloads.

---

## 🚀 Key Capabilities

1. **Central Financial & Operational Management Dashboard**: Real-time KPI summary tracking recognized revenue, direct labor costs, gross profit, and overall agency margin %.
2. **Client Margin Board**: Deterministic revenue recognition for **RETAINER**, **HOURLY**, and **PER_HIRE** models with automated margin leakage warnings (Rule 3) when margins fall below configured safety thresholds (default 20%).
3. **Contractual SLA Clock & Risk Engine**: Real-time deadline clocks calculating total hours, elapsed duration, remaining time, and consumption percentages across calendar and working days (excluding weekends and client holidays).
4. **4 Core Automated Alert Rules**:
   - **Rule 1 — Amber SLA Warning**: Triggered when $\ge 70\%$ of SLA duration has elapsed without shortlist milestone completion.
   - **Rule 2 — Red SLA Warning / Breach**: Triggered when $\ge 90\%$ of SLA duration has elapsed, or when deadline is breached.
   - **Rule 3 — Low Margin Warning**: Triggered when calculated client profit margin falls below the safety threshold.
   - **Rule 4 — Recruiter Overload**: Triggered when a recruiter exceeds the configured open roles limit or weekly hours threshold.
5. **Role-Based Access Control (RBAC)**: Strict server-side authorization separating Agency Owner, Delivery Manager, Recruiter, and Finance personas with client-level scope isolation.
6. **Time Logging & Approval Queue**: Fast daily logging, multi-select batch approval, and audited historical adjustments.
7. **Recruiter Workload Balancer**: Capacity utilization analysis with role reassignment recommendations.
8. **Billing & Reconciliation**: Comparing recognized operational revenue against issued invoices and adjustments.
9. **CSV Import & Export Center**: Dry-run preview validation with line-level error diagnosis for clients, recruiters, roles, time entries, and invoices.
10. **Weekly Executive Summary Digest**: Automated weekly management report compiling recognized revenue, profit, lowest-margin accounts, SLA breaches, and data quality warnings.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Node.js, Express, TypeScript, Zod, JWT with HTTP-only cookies and Bearer headers.
- **Database & ORM**: PostgreSQL schema & SQLite embedded runtime via Prisma ORM.
- **Testing**: Vitest and Supertest (33 automated unit and integration tests passing).
- **Notifications**: Slack Webhook integration with exponential backoff and SMTP email abstraction.

---

## ⚡ Quick Start

### 1. Installation
```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

### 2. Environment Setup
```bash
cp .env.example server/.env
```

### 3. Database Sync & Tagged Demo Seeding
```bash
cd server
npx prisma db push
npm run prisma:seed
cd ..
```

### 4. Run Development Servers
```bash
# Runs API backend on http://localhost:5000 and Vite frontend on http://localhost:5173
npm run dev
```

---

## 👤 Pre-Seeded Demo Personas

All demo personas share the password: `Password123!`

| Persona | Email | Assigned Role | Capabilities |
| :--- | :--- | :--- | :--- |
| **Victoria Vance** | `owner@agency.io` | `OWNER` | Full agency financials, business rules, user management, audit logs |
| **Marcus Sterling**| `manager@agency.io`| `MANAGER` | Delivery management, assigned clients, SLA extensions, time approvals |
| **Sarah Jenkins**  | `recruiter1@agency.io`| `RECRUITER` | Personal searches, fast time logging (no unauthorized financial figures) |
| **David Kim**      | `recruiter2@agency.io`| `RECRUITER` | Executive recruiter (simulated overloaded state on Omega Fintech) |
| **Claire Bennett** | `finance@agency.io`| `FINANCE` | Invoicing, billable placements, adjustments, financial reconciliation |

---

## 🧪 Automated Test Verification

Execute all 33 unit and integration tests:
```bash
cd server
npx vitest run
```

```
Test Files  5 passed (5)
     Tests  33 passed (33)
  Duration  2.92s
```

---

## 📚 Documentation Index

Detailed engineering manuals located in [`docs/`](file:///c:/Users/ajaym/.vscode/agency-tracker/docs):
- [System Architecture](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/SYSTEM_ARCHITECTURE.md)
- [Business Rules & Math Formulas](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/BUSINESS_RULES.md)
- [Database Relational Schema](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/DATABASE_SCHEMA.md)
- [Security & Access Isolation](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/SECURITY.md)
- [Environment Setup](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/ENVIRONMENT_SETUP.md)
- [Production Deployment Guide](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/DEPLOYMENT_GUIDE.md)
- [Backup and Recovery](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/BACKUP_AND_RECOVERY.md)
- [Testing Guide](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/TESTING_GUIDE.md)
- [CSV Import Guide](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/CSV_IMPORT_GUIDE.md)
- [Client & User Handbook](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/CLIENT_USER_GUIDE.md)
- [Known Limitations](file:///c:/Users/ajaym/.vscode/agency-tracker/docs/KNOWN_LIMITATIONS.md)

# System Architecture & Technical Specification

## Agency SLA and Margin Leakage Tracker

---

### 1. High-Level Architecture Overview
The application is structured as a decoupled, multi-tier web application designed for high-reliability agency staffing operations:

```
[ Frontend: React 18 / Vite / Tailwind CSS / Recharts ]
                            │
               HTTPS / JSON / JWT (Bearer & Cookies)
                            ▼
[ API Gateway & Middleware: Express / CORS / RBAC / Error Handlers ]
                            │
     ┌──────────────────────┼──────────────────────┐
     ▼                      ▼                      ▼
[ Business Engines ]   [ Data Access Layer ]  [ Notification & Dispatch ]
 • Margin Engine        • Prisma ORM           • Slack Webhook Service
 • SLA Clock Engine     • PostgreSQL Schema    • Email SMTP Abstraction
 • Alert Engine         • Transaction Manager  • Job Queue Retries
 • Workload Balancer
                            │
                            ▼
           [ Primary Database: PostgreSQL ]
```

---

### 2. Frontend Layer
- **Framework**: React 18 with TypeScript.
- **Bundler & Dev Server**: Vite with Hot Module Replacement (HMR).
- **Styling**: Tailwind CSS with custom dark enterprise theme design tokens (`slate-950`, `slate-900`, `sky-500`, `emerald-500`, `amber-500`, `rose-500`).
- **Icons**: Lucide React for consistent, lightweight SVGs across all 18 functional screens.
- **Charts**: Recharts for responsive SVG visualizations of client margins, revenue trends, and pipeline distributions.
- **State Management**: React Context (`AuthContext`) handling session lifecycle, current active role permissions, and tenant scope.

---

### 3. Backend & Business Logic Layer
- **Runtime**: Node.js v20+ / v22 with TypeScript (ES2022).
- **Web Framework**: Express with strict input parsing and centralized error handling.
- **Pure Business Logic Engines**:
  - `MarginCalculationEngine` (`margin.service.ts`): Deterministic revenue recognition for RETAINER, HOURLY, and PER_HIRE models. Direct labor cost allocation with hourly overhead multipliers and salary standard-hour divisors. Safe zero-revenue handling returning `null` margin % with `NO_REVENUE_DEFICIT` or `NO_ACTIVITY` status.
  - `SlaClockEngine` (`sla.service.ts`): Calendar-day and Working-day duration math, weekend and client holiday exclusions, 9:00 AM–5:00 PM business hour boundaries, pause-on-hold handling, and threshold detection for Rule 1 (Amber, $\ge 70\%$) and Rule 2 (Red / Breach, $\ge 90\%$).
  - `AlertEngine` (`alert.service.ts`): Rule 1–4 evaluation, deduplication key generation (`${type}:${entityId}:${ruleThreshold}:${period}`), resolution tracking, and reopening workflows.
  - `RecruiterWorkloadEngine` (`workload.service.ts`): Independent thresholds for open roles and weekly hours, capacity utilization calculation, and reassignment suggestions.
  - `CsvService` (`csv.service.ts`): Streaming CSV validation, dry-run schema validation, and transactional batch loading.

---

### 4. Database & Persistence Layer
- **ORM**: Prisma Client v5.
- **Relational Schema**: Fully normalized with explicit foreign key cascading, unique constraints on deduplication keys and client codes, indexes on query filters (dates, roles, statuses), and decimal fields.
- **Supported Targets**:
  - PostgreSQL (Production / Staging via `schema.postgresql.prisma`).
  - SQLite (Embedded Zero-Config Local Testing via `schema.prisma`).


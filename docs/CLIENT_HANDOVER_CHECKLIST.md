# Agency SLA & Margin Leakage Tracker — Client Handover & Operational Runbook

This document serves as the formal handover guide for operations, DevOps, and engineering teams deploying and maintaining the **Agency SLA and Margin Leakage Tracker**.

---

## 1. Architectural Overview & Services

| Service | Runtime / Technology | Description | Primary Port |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, Tailwind CSS, Recharts | Single-Page Application (SPA) served via Nginx | 3000 (HTTP) / 443 (HTTPS) |
| **Backend API** | Node.js 20, Express, TypeScript | REST API with JWT RBAC, financial calculations | 5000 |
| **Background Worker** | Durable PostgreSQL Queue (`BackgroundJob`) | Autonomous background processing (SLA check, alerts, retries) | Embedded / Standalone |
| **Database** | PostgreSQL 15+ | Relational store with ACID transactions, Decimal precision | 5432 |

---

## 2. Infrastructure & Environment Configuration

### Required Secret Variables
Before running the application in Staging or Production, ensure the following secrets are provisioned in your cloud secret manager (AWS Secrets Manager, GCP Secret Manager, Vault, or Kubernetes Secrets):

- `DATABASE_URL`: `postgresql://<user>:<password>@<host>:5432/<dbname>?schema=public&sslmode=require`
- `JWT_SECRET`: High-entropy 64-character hex secret for signing session tokens.
- `SLACK_WEBHOOK_URL`: Slack Incoming Webhook endpoint for amber/red SLA and margin notifications.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: SMTP delivery credentials.
- `CORS_ORIGIN`: Allowed origins (e.g. `https://app.youragency.com`).

---

## 3. Database Migration & Provisioning Procedures

### 3.1 Initial Clean Database Provisioning
Run migrations on a newly created PostgreSQL database:

```bash
cd server
export DATABASE_URL="postgresql://agency_admin:SECRET@db-host:5432/agency_tracker_db?schema=public&sslmode=require"
npx prisma migrate deploy
```

### 3.2 Seeding Production Baseline Data
Seed the default administrator user and core roles:

```bash
npm run seed
```
*Default login created: `admin@agency.io` / `AdminPass123!` (Prompt user to change password immediately on first login).*

### 3.3 Non-Destructive Schema Evolution & Rollback Plan
- **Pre-deployment Verification**:
  ```bash
  npx prisma migrate status
  ```
- **Forward Migration**:
  Every schema change is packaged as an idempotent SQL migration under `server/prisma/migrations/`.
- **Zero-Downtime Rollback Strategy**:
  1. All new columns must be introduced as nullable (`NULL`) or with a default value.
  2. Deprecated columns or tables are marked for decommission across a minimum 2-release deprecation cycle before removal.
  3. If a migration failure occurs, run the corresponding down-migration script archived in `server/prisma/migrations/rollbacks/` or restore from the latest point-in-time snapshot.

---

## 4. Backup & Disaster Recovery Runbook

### 4.1 Automated Daily Backup
Automated pg_dump cron job example:
```bash
pg_dump -U agency_admin -h db-host -Fc agency_tracker_db > /backups/agency_db_$(date +%Y%m%d_%H%M%S).dump
```

### 4.2 Point-In-Time Restoration Procedure
To restore from a backup:
```bash
# 1. Terminate active backend connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'agency_tracker_db' AND pid <> pg_backend_pid();

# 2. Restore database from dump
pg_restore -U agency_admin -h db-host -d agency_tracker_db -c /backups/agency_db_20261028_120000.dump
```

---

## 5. Docker Deployment Guide

### Deploying with Docker Compose
```bash
# 1. Copy production template and configure secrets
cp .env.production.example .env

# 2. Build and start containers
docker compose up -d --build

# 3. Verify health status
docker compose ps
curl http://localhost:5000/health
curl http://localhost:5000/ready
```

---

## 6. Durable Background Queue Operation

The application uses a database-backed durable queue (`BackgroundJob` model) to guarantee at-least-once processing for critical financial and SLA tasks without requiring any active browser session.

### Automatic Scheduled Jobs:
1. **`SLA_RECALCULATION`**: Runs every 10 minutes. Evaluates business-day targets and updates amber/red statuses.
2. **`ALERT_PROCESSING`**: Runs every 5 minutes. Detects margin drops (< 20%), SLA breaches, and recruiter overload.
3. **`NOTIFICATION_RETRY`**: Retries transient Slack/Email connection failures with exponential backoff.
4. **`WEEKLY_SUMMARY`**: Generates weekly management reports every Monday at 08:00 UTC.
5. **`CLEANUP`**: Automatically purges completed jobs older than 30 days.

---

## 7. Operational Readiness Checklist

- [x] **Strict Data Types**: Monetary values stored as `DECIMAL(12, 2)` to eliminate floating-point rounding errors.
- [x] **Duplicate Prevention**: Unique constraints on `[clientId, roleId, candidateName]` for placement hires and `invoiceNumber` for billing.
- [x] **Rate Historization**: Effective-dated rate records (`effectiveFrom`, `effectiveTo`) preserve immutable billing snapshots.
- [x] **CSV Upload Guardrails**: Configurable 5MB limit, 5,000 row max, duplicate key detection, dry-run previews.
- [x] **Audit Trail**: Full audit logging in `AuditLog` table for rate revisions, SLA modifications, and manual overrides.
- [x] **Role-Based Access Control**: Strict tenant scoping and RBAC (`AGENCY_OWNER`, `ACCOUNT_MANAGER`, `RECRUITER`).
- [x] **Observability**: Health checks at `/health` and readiness checks at `/ready`.

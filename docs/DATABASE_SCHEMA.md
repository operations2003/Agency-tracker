# Relational Database Schema & Data Dictionary

## Agency SLA and Margin Leakage Tracker

---

### 1. Database Architecture
The schema is normalized to 3NF and implemented via Prisma ORM.

- **Production PostgreSQL schema**: `server/prisma/schema.postgresql.prisma` (using `DECIMAL(12, 2)` for monetary values, native enum types, and table indexes).
- **Embedded SQLite runtime schema**: `server/prisma/schema.prisma` (supporting local execution and testing).

---

### 2. Core Tables and Relationships

#### `organizations`
Tenant boundary table for multi-agency isolation.
- `id` (UUID, Primary Key)
- `name` (VARCHAR)
- `slug` (VARCHAR, Unique)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `users`
Agency staff accounts across the 4 role personas.
- `id` (UUID, Primary Key)
- `organization_id` (UUID, Foreign Key -> `organizations.id`)
- `email` (VARCHAR, Unique)
- `password_hash` (VARCHAR)
- `name` (VARCHAR)
- `role` (ENUM / VARCHAR: `OWNER`, `MANAGER`, `RECRUITER`, `FINANCE`)
- `is_active` (BOOLEAN, default true)
- `title` (VARCHAR, nullable)

#### `clients`
Client company master record.
- `id` (UUID, Primary Key)
- `organization_id` (UUID, Foreign Key -> `organizations.id`)
- `name` (VARCHAR)
- `code` (VARCHAR, Unique)
- `status` (VARCHAR: `ACTIVE`, `INACTIVE`, `ARCHIVED`)
- `billing_model` (ENUM / VARCHAR: `RETAINER`, `HOURLY`, `PER_HIRE`)
- `currency` (VARCHAR, default `USD`)
- `time_zone` (VARCHAR, default `America/New_York`)
- `margin_warning_threshold` (DECIMAL, default 20.00)
- `deadline_policy` (ENUM / VARCHAR: `WORKING_DAYS`, `CALENDAR_DAYS`)

#### `contract_terms`
Effective-dated contract terms preserving historical rates.
- `id` (UUID, Primary Key)
- `client_id` (UUID, Foreign Key -> `clients.id`)
- `billing_model` (ENUM / VARCHAR)
- `billing_rate` (DECIMAL)
- `currency` (VARCHAR)
- `effective_from` (TIMESTAMPTZ)
- `effective_to` (TIMESTAMPTZ, nullable)
- `sla_penalty_percentage` (DECIMAL, default 0.00)

#### `recruitment_roles`
Search requests subject to contractual SLA clocks.
- `id` (UUID, Primary Key)
- `client_id` (UUID, Foreign Key -> `clients.id`)
- `recruiter_id` (UUID, Foreign Key -> `users.id`, nullable)
- `manager_id` (UUID, Foreign Key -> `users.id`, nullable)
- `title` (VARCHAR)
- `priority` (VARCHAR: `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `status` (VARCHAR: `OPEN`, `ON_HOLD`, `FILLED`, `CANCELLED`)
- `current_stage` (VARCHAR)
- `request_received_date` (TIMESTAMPTZ)
- `sla_start_date` (TIMESTAMPTZ)
- `sla_deadline_date` (TIMESTAMPTZ)
- `deadline_policy` (VARCHAR)
- `shortlist_submitted_date` (TIMESTAMPTZ, nullable)
- `filled_date` (TIMESTAMPTZ, nullable)
- `is_breached` (BOOLEAN, default false)

#### `time_entries`
Recruiter labor logging with approval and audit history.
- `id` (UUID, Primary Key)
- `recruiter_id` (UUID, Foreign Key -> `users.id`)
- `client_id` (UUID, Foreign Key -> `clients.id`)
- `role_id` (UUID, Foreign Key -> `recruitment_roles.id`, nullable)
- `task_type` (VARCHAR)
- `work_date` (DATE)
- `hours` (DECIMAL)
- `is_billable` (BOOLEAN, default true)
- `status` (VARCHAR: `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`)
- `reviewed_by_id` (UUID, Foreign Key -> `users.id`, nullable)
- `reviewed_at` (TIMESTAMPTZ, nullable)

#### `alerts`
Centralized alert registry with deduplication keys.
- `id` (UUID, Primary Key)
- `organization_id` (UUID, Foreign Key -> `organizations.id`)
- `type` (VARCHAR: `AMBER_SLA`, `RED_SLA`, `LOW_MARGIN`, `RECRUITER_OVERLOAD`)
- `severity` (VARCHAR: `INFO`, `WARNING`, `CRITICAL`)
- `client_id` (UUID, Foreign Key -> `clients.id`, nullable)
- `role_id` (UUID, Foreign Key -> `recruitment_roles.id`, nullable)
- `recruiter_id` (UUID, Foreign Key -> `users.id`, nullable)
- `trigger_rule` (VARCHAR)
- `threshold_value` (DECIMAL, nullable)
- `actual_value` (DECIMAL, nullable)
- `message` (TEXT)
- `status` (VARCHAR: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`)
- `deduplication_key` (VARCHAR, Unique)
- `detected_at` (TIMESTAMPTZ)
- `resolved_at` (TIMESTAMPTZ, nullable)
- `resolved_by_id` (UUID, nullable)
- `resolution_notes` (TEXT, nullable)


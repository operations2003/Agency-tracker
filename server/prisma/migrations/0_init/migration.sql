-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'MANAGER', 'RECRUITER', 'FINANCE');
CREATE TYPE "BillingModel" AS ENUM ('RETAINER', 'HOURLY', 'PER_HIRE');
CREATE TYPE "DeadlinePolicy" AS ENUM ('CALENDAR_DAYS', 'WORKING_DAYS');
CREATE TYPE "RoleStatus" AS ENUM ('OPEN', 'ON_HOLD', 'FILLED', 'CANCELLED');
CREATE TYPE "PipelineStage" AS ENUM ('NEW_REQUEST', 'SOURCING', 'SCREENING', 'SHORTLISTING', 'SHORTLIST_SUBMITTED', 'INTERVIEW', 'OFFER', 'HIRED_FILLED', 'ON_HOLD', 'CANCELLED');
CREATE TYPE "TimeEntryStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE "RecruiterCostType" AS ENUM ('HOURLY', 'SALARIED');
CREATE TYPE "AlertType" AS ENUM ('AMBER_SLA', 'RED_SLA', 'LOW_MARGIN', 'RECRUITER_OVERLOAD');
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable organizations
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'RECRUITER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable clients
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "billing_model" "BillingModel" NOT NULL DEFAULT 'RETAINER',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "time_zone" TEXT NOT NULL DEFAULT 'America/New_York',
    "margin_warning_threshold" DECIMAL(5,2) NOT NULL DEFAULT 20.0,
    "deadline_policy" "DeadlinePolicy" NOT NULL DEFAULT 'WORKING_DAYS',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable user_client_assignments
CREATE TABLE "user_client_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_client_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable contract_terms
CREATE TABLE "contract_terms" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "billing_model" "BillingModel" NOT NULL,
    "billing_rate" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "sla_penalty_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable sla_policies
CREATE TABLE "sla_policies" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "default_target_days" INTEGER NOT NULL DEFAULT 14,
    "deadline_policy" "DeadlinePolicy" NOT NULL DEFAULT 'WORKING_DAYS',
    "business_hour_start" INTEGER NOT NULL DEFAULT 9,
    "business_hour_end" INTEGER NOT NULL DEFAULT 17,
    "shortlist_stage_target" "PipelineStage" NOT NULL DEFAULT 'SHORTLIST_SUBMITTED',
    "pause_on_hold" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable holiday_calendars
CREATE TABLE "holiday_calendars" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 2026,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "holiday_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable holidays
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable recruitment_roles
CREATE TABLE "recruitment_roles" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "recruiter_id" TEXT,
    "manager_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" "RoleStatus" NOT NULL DEFAULT 'OPEN',
    "current_stage" "PipelineStage" NOT NULL DEFAULT 'NEW_REQUEST',
    "request_received_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sla_start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sla_deadline_date" TIMESTAMP(3) NOT NULL,
    "deadline_policy" "DeadlinePolicy" NOT NULL DEFAULT 'WORKING_DAYS',
    "shortlist_submitted_date" TIMESTAMP(3),
    "filled_date" TIMESTAMP(3),
    "is_breached" BOOLEAN NOT NULL DEFAULT false,
    "breached_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recruitment_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable sla_extensions
CREATE TABLE "sla_extensions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "added_days" INTEGER NOT NULL,
    "extended_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sla_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable role_stage_histories
CREATE TABLE "role_stage_histories" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "from_stage" "PipelineStage",
    "to_stage" "PipelineStage" NOT NULL,
    "notes" TEXT,
    "changed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_stage_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable recruiter_cost_profiles
CREATE TABLE "recruiter_cost_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cost_type" "RecruiterCostType" NOT NULL DEFAULT 'HOURLY',
    "hourly_cost_rate" DECIMAL(10,2),
    "monthly_salary" DECIMAL(12,2),
    "standard_weekly_hours" DECIMAL(5,2) NOT NULL DEFAULT 40.0,
    "overhead_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recruiter_cost_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable time_entries
CREATE TABLE "time_entries" (
    "id" TEXT NOT NULL,
    "recruiter_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "role_id" TEXT,
    "task_type" TEXT NOT NULL,
    "work_date" DATE NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "is_billable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "status" "TimeEntryStatus" NOT NULL DEFAULT 'SUBMITTED',
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable time_entry_adjustments
CREATE TABLE "time_entry_adjustments" (
    "id" TEXT NOT NULL,
    "time_entry_id" TEXT NOT NULL,
    "adjusted_hours" DECIMAL(5,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "adjusted_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "time_entry_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable invoices
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issued_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable invoice_line_items
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(8,2) NOT NULL DEFAULT 1.0,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable billable_hires
CREATE TABLE "billable_hires" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "candidate_name" TEXT NOT NULL,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "fee_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "billable_hires_pkey" PRIMARY KEY ("id")
);

-- CreateTable financial_adjustments
CREATE TABLE "financial_adjustments" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable alerts
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "client_id" TEXT,
    "role_id" TEXT,
    "recruiter_id" TEXT,
    "trigger_rule" TEXT NOT NULL,
    "threshold_value" DECIMAL(10,2),
    "actual_value" DECIMAL(10,2),
    "message" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "deduplication_key" TEXT NOT NULL,
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "resolution_notes" TEXT,
    "last_notification_attempt" TIMESTAMP(3),
    "notification_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable alert_delivery_logs
CREATE TABLE "alert_delivery_logs" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alert_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable import_jobs
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "imported_rows" INTEGER NOT NULL DEFAULT 0,
    "failed_rows" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "performed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable import_row_errors
CREATE TABLE "import_row_errors" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "field" TEXT,
    "message" TEXT NOT NULL,
    "raw_data" TEXT,
    CONSTRAINT "import_row_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable system_settings
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable weekly_reports
CREATE TABLE "weekly_reports" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "summary_json" TEXT NOT NULL,
    "sent_to_emails" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable background_jobs
CREATE TABLE "background_jobs" (
    "id" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "locked_by" TEXT,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE UNIQUE INDEX "clients_code_key" ON "clients"("code");
CREATE INDEX "clients_organization_id_idx" ON "clients"("organization_id");
CREATE UNIQUE INDEX "user_client_assignments_user_id_client_id_key" ON "user_client_assignments"("user_id", "client_id");
CREATE INDEX "contract_terms_client_id_idx" ON "contract_terms"("client_id");
CREATE INDEX "contract_terms_effective_from_effective_to_idx" ON "contract_terms"("effective_from", "effective_to");
CREATE UNIQUE INDEX "sla_policies_client_id_key" ON "sla_policies"("client_id");
CREATE UNIQUE INDEX "holiday_calendars_client_id_key" ON "holiday_calendars"("client_id");
CREATE INDEX "holidays_calendar_id_idx" ON "holidays"("calendar_id");
CREATE INDEX "recruitment_roles_client_id_idx" ON "recruitment_roles"("client_id");
CREATE INDEX "recruitment_roles_recruiter_id_idx" ON "recruitment_roles"("recruiter_id");
CREATE INDEX "recruitment_roles_status_idx" ON "recruitment_roles"("status");
CREATE INDEX "recruitment_roles_sla_deadline_date_idx" ON "recruitment_roles"("sla_deadline_date");
CREATE INDEX "sla_extensions_role_id_idx" ON "sla_extensions"("role_id");
CREATE INDEX "role_stage_histories_role_id_idx" ON "role_stage_histories"("role_id");
CREATE INDEX "recruiter_cost_profiles_user_id_idx" ON "recruiter_cost_profiles"("user_id");
CREATE INDEX "recruiter_cost_profiles_effective_from_effective_to_idx" ON "recruiter_cost_profiles"("effective_from", "effective_to");
CREATE INDEX "time_entries_recruiter_id_idx" ON "time_entries"("recruiter_id");
CREATE INDEX "time_entries_client_id_idx" ON "time_entries"("client_id");
CREATE INDEX "time_entries_work_date_idx" ON "time_entries"("work_date");
CREATE INDEX "time_entries_status_idx" ON "time_entries"("status");
CREATE INDEX "time_entry_adjustments_time_entry_id_idx" ON "time_entry_adjustments"("time_entry_id");
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");
CREATE INDEX "invoices_period_start_period_end_idx" ON "invoices"("period_start", "period_end");
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");
CREATE UNIQUE INDEX "billable_hires_client_id_role_id_candidate_name_key" ON "billable_hires"("client_id", "role_id", "candidate_name");
CREATE INDEX "billable_hires_client_id_idx" ON "billable_hires"("client_id");
CREATE INDEX "billable_hires_role_id_idx" ON "billable_hires"("role_id");
CREATE INDEX "billable_hires_hire_date_idx" ON "billable_hires"("hire_date");
CREATE INDEX "financial_adjustments_client_id_idx" ON "financial_adjustments"("client_id");
CREATE INDEX "financial_adjustments_date_idx" ON "financial_adjustments"("date");
CREATE UNIQUE INDEX "alerts_deduplication_key_key" ON "alerts"("deduplication_key");
CREATE INDEX "alerts_organization_id_idx" ON "alerts"("organization_id");
CREATE INDEX "alerts_type_idx" ON "alerts"("type");
CREATE INDEX "alerts_status_idx" ON "alerts"("status");
CREATE INDEX "alerts_detected_at_idx" ON "alerts"("detected_at");
CREATE INDEX "alert_delivery_logs_alert_id_idx" ON "alert_delivery_logs"("alert_id");
CREATE INDEX "import_row_errors_job_id_idx" ON "import_row_errors"("job_id");
CREATE UNIQUE INDEX "system_settings_organization_id_key_key" ON "system_settings"("organization_id", "key");
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
CREATE INDEX "weekly_reports_organization_id_idx" ON "weekly_reports"("organization_id");
CREATE INDEX "background_jobs_status_run_at_idx" ON "background_jobs"("status", "run_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_client_assignments" ADD CONSTRAINT "user_client_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_client_assignments" ADD CONSTRAINT "user_client_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_terms" ADD CONSTRAINT "contract_terms_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_calendar_id_fkey" FOREIGN KEY ("calendar_id") REFERENCES "holiday_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruitment_roles" ADD CONSTRAINT "recruitment_roles_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruitment_roles" ADD CONSTRAINT "recruitment_roles_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recruitment_roles" ADD CONSTRAINT "recruitment_roles_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sla_extensions" ADD CONSTRAINT "sla_extensions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "recruitment_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_stage_histories" ADD CONSTRAINT "role_stage_histories_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "recruitment_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recruiter_cost_profiles" ADD CONSTRAINT "recruiter_cost_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "recruitment_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "time_entry_adjustments" ADD CONSTRAINT "time_entry_adjustments_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "time_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billable_hires" ADD CONSTRAINT "billable_hires_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billable_hires" ADD CONSTRAINT "billable_hires_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "recruitment_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_adjustments" ADD CONSTRAINT "financial_adjustments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "recruitment_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "alert_delivery_logs" ADD CONSTRAINT "alert_delivery_logs_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_row_errors" ADD CONSTRAINT "import_row_errors_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

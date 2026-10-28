# Known Limitations and Assumptions

## Agency SLA and Margin Leakage Tracker

---

### 1. Multi-Currency Operations
- Default agency reporting currency is **USD** (`$`).
- While contracts and invoices store explicit currency fields (`USD`, `EUR`, `GBP`), automatic foreign exchange rate fetching via external FX APIs is scheduled for subsequent releases. Reports currently group amounts in their contractual currency base.

### 2. SLA Working-Day Boundaries
- Working days assume standard business hours between 9:00 AM and 5:00 PM (8 working hours/day) in the client's configured IANA time zone.
- Calendar-day policies treat time continuously 24/7 across weekends.

### 3. Notification Dispatch
- The application provides full Slack Webhook formatting and delivery with exponential backoff retries.
- Email delivery features an abstracted SMTP provider module with structured delivery logging and retry queues. Real SMTP credentials should be supplied in production via environment variables (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`).

### 4. Background Job Scheduling
- Scheduled SLA clock evaluations and weekly digests can be triggered automatically via the scheduler or on-demand via the **Run Scheduled Risk Scan** button in the Alert Center.

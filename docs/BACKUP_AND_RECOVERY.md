# Backup and Recovery Procedures

## Agency SLA and Margin Leakage Tracker

---

### 1. Database Backup Strategy

#### Automated PostgreSQL Backups
- **Continuous Archiving**: Enable WAL (Write-Ahead Logging) archiving with point-in-time recovery (PITR) up to 14 days on AWS RDS / Managed PostgreSQL.
- **Daily Full Snapshot**: Scheduled automated snapshot triggered at 02:00 UTC daily during low operational activity.

#### Manual On-Demand Backups
Run `pg_dump` prior to system migrations or major contract updates:
```bash
pg_dump -h <HOST> -U <USER> -d agency_tracker -F c -b -v -f "agency_tracker_backup_$(date +%Y%m%d_%H%M%S).dump"
```

For SQLite local environments:
```bash
sqlite3 dev.db ".backup 'dev_backup.db'"
```

---

### 2. Disaster Recovery Procedure

1. **Provision New Database Instance**:
   Spin up a fresh PostgreSQL instance matching the version of the previous database.
2. **Restore Snapshot**:
   ```bash
   pg_restore -h <HOST> -U <USER> -d agency_tracker -v "agency_tracker_backup.dump"
   ```
3. **Verify Data Integrity**:
   - Confirm row counts for `clients`, `time_entries`, and `recruitment_roles`.
   - Run verification query:
     ```sql
     SELECT count(*) FROM time_entries WHERE status = 'APPROVED';
     ```
4. **Update Connection String & Restart Service**:
   Update `DATABASE_URL` in backend secret configuration and deploy.
5. **Post-Recovery Health Verification**:
   Query `GET /health` and `GET /ready` to confirm full database connectivity.

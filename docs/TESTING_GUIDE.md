# Testing Guide and Verification Suite

## Agency SLA and Margin Leakage Tracker

---

### 1. Test Suite Architecture
The test suite utilizes **Vitest** for fast unit testing and **Supertest** for full-stack HTTP integration testing.

Automated tests cover:
1. All three contractual billing models (Retainer, Hourly, Per-Hire).
2. Profit and profit margin formulas, including zero-revenue deficit edge cases.
3. Hourly vs Salaried cost allocation with overhead burden.
4. Effective-dated rate overrides and historical reporting preservation.
5. Rule 1: Amber SLA warning threshold (≥70% consumed without shortlist milestone).
6. Rule 2: Red SLA warning threshold (≥90% consumed or breached).
7. Working-day calendar math (excluding weekends and client holidays).
8. Alert deduplication keys preventing alert spam.
9. Recruiter overload thresholds (open roles & weekly hours).
10. Time-entry approval and audited adjustments.
11. CSV template generation and validation.
12. Role-based permission guards (rejecting unauthorized roles and cross-tenant tampering).

---

### 2. Running Automated Tests
Run the entire suite from the workspace root:
```bash
# Run all server unit and integration tests
npm run test
```
Or inside the `server/` directory:
```bash
cd server
npx vitest run
```

### 3. Verification Evidence
All 33 tests across 5 test suites execute and pass:
- `margin.test.ts`: 9 tests passing.
- `sla.test.ts`: 7 tests passing.
- `workload.test.ts`: 4 tests passing.
- `alert.test.ts`: 6 tests passing.
- `integration.test.ts`: 7 tests passing.


# Security Architecture and Data Isolation Policy

## Agency SLA and Margin Leakage Tracker

---

### 1. Multi-Tenant and Client-Level Access Control (RBAC)

1. **Authentication**:
   - Secure stateless JWT tokens signed with SHA-256 HMAC and configured via `JWT_SECRET`.
   - Dual delivery: Transmitted via HTTP-only, SameSite cookies and `Authorization: Bearer <token>` headers.
   - Tokens carry verified server identity: `{ id, email, role, organizationId, assignedClientIds }`.
2. **Server-Side Authorization**:
   - Authorization is strictly enforced at every API endpoint in middleware (`requireRole`, `requireClientAccess`).
   - Hiding frontend buttons is never relied upon for security.
   - Recruiter accounts can only access time entries and searches belonging to themselves or explicitly assigned clients.
   - Account Managers can only access recruitment searches and clients explicitly assigned to them.
   - Agency Owners and Finance roles have agency-wide scope within their authenticated organization.
3. **Tenant Boundary Isolation**:
   - Every database query automatically filters by `organizationId`.
   - Users from one agency tenant can never read or mutate records belonging to another agency by tampering with IDs or URL parameters (BOLA / IDOR protection).

---

### 2. Password Security and Credentials
- Passwords hashed using bcrypt with cost factor 10.
- Raw passwords and sensitive tokens are never written to application logs, audit trails, or error responses.
- Secrets and integration keys are configured strictly via environment variables.

---

### 3. Financial and Audit Integrity
- Approved historical time entries cannot be updated or deleted directly; corrections require an audited adjustment record with a mandatory audit reason.
- Contract rate changes are effective-dated so historical reporting retains exact historical cost and billing bases.
- Every financial adjustment and security event is recorded in the immutable `audit_logs` table.

---

### 4. Input Validation and Defense in Depth
- Parameterized SQL execution via Prisma ORM prevents SQL injection.
- CSV imports run full schema dry-run checks prior to batch transaction execution.
- Upload file sizes and row counts are limited to prevent memory exhaustion / DoS.

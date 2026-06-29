# Security Design

## 1. Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LAYER 1: Network Security                                │   │
│  │  TLS 1.3 │ WAF │ Rate Limiting │ DDoS Protection         │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LAYER 2: Authentication                                  │   │
│  │  NextAuth JWT │ Session Management │ Account Lockout       │   │
│  │  e-Albania OIDC (Phase 2) │ MFA (Phase 2)               │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LAYER 3: Authorization                                   │   │
│  │  RBAC │ Organization Scoping │ Document Classification    │   │
│  │  Workflow Action Guards │ API Route Protection           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LAYER 4: Data Security                                   │   │
│  │  Encryption at Rest │ Checksum Verification │ Soft Delete│   │
│  │  Input Validation │ SQL Injection Prevention (Prisma)      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LAYER 5: Audit & Monitoring                              │   │
│  │  Immutable Audit Log │ Document Access Log │ Failed Auth  │   │
│  │  Security Event Alerts │ Anomaly Detection (Phase 2)      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Authentication Security

### 2.1 Password Policy (Phase 1)

| Rule | Value |
|------|-------|
| Minimum length | 12 characters |
| Complexity | Upper + lower + digit + special character |
| Hashing algorithm | bcrypt (cost factor 12) |
| Password history | Last 5 passwords cannot be reused (Phase 2) |
| Max failed attempts | 5 consecutive failures |
| Lockout duration | 30 minutes (exponential backoff on repeat) |
| Password reset token expiry | 1 hour, single use |

### 2.2 Session Security

| Parameter | Value |
|-----------|-------|
| Session type | JWT (signed with HS512 or RS256) |
| Session duration | 8 hours |
| Idle timeout | 2 hours (extend on activity) |
| Token storage | HTTP-only secure cookie |
| SameSite | Strict |
| CSRF protection | Built into NextAuth + Server Actions |

### 2.3 e-Albania Integration Security (Phase 2)

| Concern | Mitigation |
|---------|------------|
| OIDC token validation | Verify issuer, audience, signature, expiry |
| Account linking | NID match required; manual review for mismatches |
| Token refresh | Secure refresh token rotation |
| Fallback auth | Credentials provider remains for non-e-Albania users |

## 3. Role-Based Access Control (RBAC)

### 3.1 RBAC Model

```
User ──membership──▶ Organization
                         │
                    membership.role
                         │
                    Role ──grants──▶ Permissions
```

- Permissions are **static** (defined at deployment, not user-editable)
- Roles map to permissions via `auth_role_permissions` seed data
- Organization type constrains which roles are valid (e.g., INSTALLER role only in INSTALLER org)

### 3.2 Permission Enforcement Points

| Layer | Mechanism |
|-------|-----------|
| Route middleware | Next.js middleware checks role before page render |
| Server Action guard | `requirePermission(action)` at action entry |
| Domain service guard | Service methods validate actor permissions |
| Prisma middleware | Organization scope injection on queries |
| Document access | Classification-based check before download |

### 3.3 Permission Check Flow

```
Request received
  → Extract session (JWT)
  → Load user + active org + role
  → Check route permission (middleware)
  → Check action permission (service layer)
  → Apply organization scope (Prisma middleware)
  → Check document classification (if document access)
  → Execute operation
  → Log to audit trail
```

## 4. Organization-Based Access Control

### 4.1 Data Isolation Rules

| Entity | Scope Rule |
|--------|------------|
| Applications | `owner_org_id = active_org` OR `installer_org_id = active_org` OR `certifier_org_id = active_org` OR actor is ISHMT |
| Elevators | `owner_org_id = active_org` OR `maintenance_org_id = active_org` OR actor is ISHMT |
| Maintenance records | `maintenance_org_id = active_org` OR elevator owner OR ISHMT |
| Inspections | ISHMT only (inspectors see assigned region) |
| Documents | Classification + entity ownership chain |
| Organizations | Own org profile OR Directorate (for installer/OMI) OR ISHMT admin |

### 4.2 Prisma Scope Middleware

Conceptual implementation:

```
// Before every findMany/findFirst:
if (user.role NOT IN [ADMIN, INSPECTOR]) {
  inject WHERE clause based on entity type and user.active_org_id
}
```

This prevents data leakage even if a developer forgets to add a WHERE clause in a query.

## 5. Document Security

### 5.1 Storage Security

| Measure | Implementation |
|---------|----------------|
| Path obfuscation | UUID-based paths: `/storage/{uuid}/{uuid}.ext` |
| No direct URL access | All downloads through authenticated API route |
| Signed URLs | Time-limited (15 min) for authorized downloads |
| Checksum verification | SHA-256 stored; verified on download |
| MIME validation | Server-side magic byte check (not just extension) |
| Size limits | 25MB per file (configurable) |
| Allowed types | PDF, JPEG, PNG, DOCX, XLSX (configurable whitelist) |

### 5.2 Document Access Control Matrix

Access determined by:
1. Document classification (see User Access Matrix)
2. Entity ownership chain (who owns the linked application/elevator)
3. Actor role and organization

Every document access (view/download) is logged in `doc_access_log`.

### 5.3 Document Upload Security

```
Upload request
  → Authenticate user
  → Validate MIME type (magic bytes)
  → Validate file size
  → Scan filename (no path traversal)
  → Generate UUID storage path
  → Compute SHA-256 checksum
  → Store in document storage
  → Create doc_documents record
  → Link to entity
  → Audit log: DOCUMENT_UPLOAD
```

## 6. API Security

### 6.1 Rate Limiting

| Endpoint Category | Limit |
|-------------------|-------|
| Authentication (login) | 10 requests / minute / IP |
| Public QR profile | 60 requests / minute / IP |
| Citizen report submission | 5 requests / hour / IP |
| Authenticated API | 120 requests / minute / user |
| File upload | 10 requests / minute / user |
| Excel import | 2 requests / hour / user |

### 6.2 Input Validation

| Layer | Tool |
|-------|------|
| API input | Zod schemas for all Server Actions and API routes |
| SQL injection | Prisma parameterized queries (no raw SQL in Phase 1) |
| XSS | React auto-escaping; CSP headers |
| File upload | MIME + size + extension validation |

### 6.3 Security Headers

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0 (deprecated, rely on CSP)
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

## 7. Audit Model

### 7.1 Audit Principles

| Principle | Implementation |
|-----------|----------------|
| Completeness | Every mutation is audited |
| Immutability | Append-only table; no UPDATE/DELETE |
| Tamper evidence | Actor + timestamp + before/after state |
| Correlation | `correlation_id` links related actions (e.g., approval → elevator creation → certificate → QR) |
| Retention | Permanent (no purge) |
| Accessibility | ISHMT admin can search; inspectors can view entity trails |

### 7.2 Audited Events

| Category | Events |
|----------|--------|
| Authentication | LOGIN, LOGOUT, FAILED_LOGIN, PASSWORD_RESET, ACCOUNT_LOCKED |
| Authorization | PERMISSION_DENIED |
| Application | CREATE, STATUS_CHANGE (every transition), ASSIGNMENT |
| Elevator | CREATE, STATUS_CHANGE, FIELD_UPDATE |
| Certificate | CREATE, REVOKE, EXPIRE |
| Document | UPLOAD, DOWNLOAD, DELETE |
| Organization | CREATE, UPDATE, STATUS_CHANGE, LICENSE_CHANGE |
| Inspection | CREATE, RESULT_RECORDED |
| Maintenance | RECORD_CREATED |
| Migration | IMPORT_START, IMPORT_COMPLETE, ROLLBACK |
| Citizen Report | CREATE, STATUS_CHANGE, RESOLUTION |
| System | CONFIG_CHANGE, USER_PROVISIONED, USER_DEACTIVATED |

### 7.3 Audit Log Structure

```json
{
  "id": "uuid",
  "actor_id": "user-uuid",
  "action": "WORKFLOW_TRANSITION",
  "entity_type": "application",
  "entity_id": "app-uuid",
  "before_state": { "status": "SUBMITTED" },
  "after_state": { "status": "APPROVED" },
  "metadata": {
    "application_number": "APP-2026-REG-000015",
    "comment": "All documents verified"
  },
  "ip_address": "192.168.1.1",
  "correlation_id": "workflow-uuid",
  "created_at": "2026-06-08T10:30:00Z"
}
```

### 7.4 Audit Database Security

- Application database role: `INSERT` only on `audit_logs`
- No application code path calls `UPDATE` or `DELETE` on audit table
- Audit queries use read-only database role
- Phase 2: Monthly range partitioning for query performance

## 8. Soft Delete Strategy

### 8.1 Soft Delete Rules

| Entity | Soft Delete | Who Can Delete | Cascade Behavior |
|--------|-------------|----------------|------------------|
| auth_users | Yes | ADMIN | Deactivate memberships |
| org_organizations | Yes | ADMIN, DIRECTORATE | Cannot delete if linked to active elevators |
| app_applications | Yes | OWNER (DRAFT only), ADMIN | Cascade to application_data |
| elv_elevators | Yes | ADMIN only | Never delete; deregister instead |
| doc_documents | Yes | Uploader, ADMIN | Unlink from entities |
| cert_certificates | No | Revoke instead | Status → REVOKED |
| audit_logs | **Never** | N/A | Immutable |
| mig_batches | No | Status tracking | Rollback instead |

### 8.2 Query Pattern

All active-record queries include `WHERE deleted_at IS NULL` via Prisma middleware or scoped query helpers. Partial indexes optimize this pattern.

## 9. Data Protection

### 9.1 Encryption

| Data | Protection |
|------|------------|
| Passwords | bcrypt hash (never stored plaintext) |
| Database | Encryption at rest (PostgreSQL TDE or disk-level) |
| Documents | Encryption at rest in object storage (AES-256) |
| Transit | TLS 1.3 for all connections |
| PII fields | No additional field-level encryption in Phase 1; assess for Phase 2 |
| Backups | Encrypted backup storage |

### 9.2 PII Handling

| Field | Classification | Access |
|-------|---------------|--------|
| User email | PII | Self + ADMIN |
| User phone | PII | Self + ADMIN |
| NID (National ID) | Sensitive PII | Self + ADMIN |
| Owner contact on elevator | PII | Owner org + ISHMT |
| Citizen reporter contact | PII | ISHMT only (not linked to public profile) |

## 10. Threat Model

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Unauthorized elevator data access | Medium | High | RBAC + org scoping + audit |
| Company impersonation | Medium | High | Directorate-managed registry; QKB validation |
| Document tampering | Low | High | Checksum verification; access logging |
| Workflow bypass (direct elevator creation) | Medium | Critical | No API endpoint for direct creation; service-layer enforcement |
| Brute force login | High | Medium | Rate limiting + account lockout |
| SQL injection | Low | Critical | Prisma ORM (parameterized) |
| Privilege escalation | Low | Critical | Static permissions; no user-editable roles |
| Data exfiltration via export | Medium | High | Export permission restricted to ISHMT; export audit logged |
| Legacy import data corruption | Medium | High | Staging + validation + rollback |
| Session hijacking | Low | High | HTTP-only cookies, Secure flag, SameSite |

## 11. Compliance Considerations

| Requirement | Approach |
|-------------|----------|
| Data retention (10 years) | Soft delete + no purge + backup retention policy |
| Right to audit | Full audit trail with before/after states |
| Government data sovereignty | On-premise or Albania-hosted cloud deployment |
| Accessibility of public data | QR profile provides mandated public information |
| Regulatory reporting | Built-in report generation for ISHMT obligations |

## 12. Security Testing Plan (Pre-Production)

| Test | Scope |
|------|-------|
| OWASP Top 10 scan | All API routes and forms |
| RBAC matrix verification | Automated tests for every role × action combination |
| Organization isolation test | Verify no cross-org data leakage |
| Workflow bypass test | Attempt direct elevator creation via API |
| Document access test | Verify classification enforcement |
| Rate limit test | Verify throttling on auth and public endpoints |
| Audit completeness test | Verify every mutation produces audit entry |
| Penetration test | External security assessment before go-live |

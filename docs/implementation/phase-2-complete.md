# Phase 2 - Authentication, Authorization & Organizations

**Status:** COMPLETE - Awaiting Approval for Phase 3  
**Date:** June 8, 2026

---

## Delivered (Steps 2.1 – 2.10)

| Step | Deliverable | Status |
|------|-------------|--------|
| 2.1 | Seed: geography, roles, permissions, system orgs, dev users | ✅ |
| 2.2 | NextAuth credentials + JWT session extensions | ✅ |
| 2.3 | Owner & maintenance registration flows | ✅ |
| 2.4 | RBAC guards + permission matrix | ✅ |
| 2.5 | Middleware route protection | ✅ |
| 2.6 | OrganizationService + MembershipService + LicenseService | ✅ |
| 2.7 | Directorate portal (companies + licenses) | ✅ |
| 2.8 | Manual QKB validation admin queue | ✅ |
| 2.9 | Role dashboards + organization switcher | ✅ |
| 2.10 | Integration tests for RBAC matrix (10 tests) | ✅ |

---

## Key Files

### Auth
- `src/lib/auth/config.ts` - NextAuth + credentials + JWT callbacks
- `src/lib/auth/password.ts` - bcrypt + policy validation
- `src/lib/auth/session-context.ts` - org-aware session building
- `src/app/api/auth/[...nextauth]/route.ts`

### RBAC
- `src/lib/permissions/codes.ts` - 17 permission codes
- `src/lib/permissions/matrix.ts` - role → permission mapping
- `src/lib/permissions/guards.ts` - `requireAuth`, `requirePermission`, `requireRole`
- `src/lib/permissions/routes.ts` - route → role mapping
- `src/middleware.ts` - JWT route protection

### Services
- `src/lib/services/auth-service.ts`
- `src/lib/services/organization-service.ts`
- `src/lib/services/membership-service.ts`
- `src/lib/services/license-service.ts`
- `src/lib/services/qkb-validation-service.ts`
- `src/lib/audit/audit-service.ts`

### UI (Albanian)
- `/auth/login`, `/auth/register`, `/auth/register/maintenance`
- `/auth/forgot-password`, `/auth/reset-password`
- `/portal/dashboard`, `/portal/settings/*`
- `/ishmt/dashboard`, `/ishmt/admin/qkb-validation`
- `/directorate/companies/*`
- `/unauthorized`

### Seed
- `prisma/seed.ts` - idempotent
- `prisma/seed/data/geo-albania.json` - 12 regions, 21 municipalities

### Tests
- `tests/integration/rbac.test.ts` - 10 passing tests

---

## Dev Credentials (after `npm run db:seed`)

| Email | Role | Password |
|-------|------|----------|
| admin@ishmtt.gov.al | ADMIN | IshmittDev2026! |
| inspector@ishmtt.gov.al | INSPECTOR | IshmittDev2026! |
| directorate@ishmtt.gov.al | DIRECTORATE | IshmittDev2026! |
| owner@example.al | OWNER | IshmittDev2026! |
| installer@example.al | INSTALLER | IshmittDev2026! |
| certifier@example.al | CERTIFIER | IshmittDev2026! |
| maintenance@example.al | MAINTENANCE (validated) | IshmittDev2026! |
| maintenance-pending@example.al | MAINTENANCE (pending QKB) | IshmittDev2026! |

---

## Confirmed Business Rules Enforced

| Rule | Implementation |
|------|----------------|
| RULE 2 | Only DIRECTORATE can create INSTALLER orgs |
| RULE 3 | Only DIRECTORATE can create CERTIFIER orgs |
| RULE 4 | Maintenance orgs start PENDING_VALIDATION; QKB manual flow |
| RULE 5 | AuditService on login, logout, permission denied, org/license/QKB mutations |
| No installer/certifier self-registration | Registration UI only for owner + maintenance |
| ADMIN read-only on directorate write routes | Middleware blocks `/new` and `/edit` for ADMIN |

---

## Quick Start

```bash
npm run docker:up
npm run db:push
npm run db:seed
npm run dev
```

Password reset in dev: token logged to console.

---

## Phase 2 Approval Checklist

### Authentication
- [ ] Owner can register, login, logout
- [ ] Maintenance company can register (PENDING_VALIDATION)
- [ ] Installer/Certifier/ISHMT/Directorate cannot self-register
- [ ] Password policy enforced (12+ chars, complexity)
- [ ] Account locks after 5 failed logins
- [ ] Password reset logs token to console in dev
- [ ] Login/logout audited

### RBAC
- [ ] 8 roles and 17 permissions seeded
- [ ] Permission matrix matches access matrix for Phase 2 modules
- [ ] `requirePermission()` blocks unauthorized actions
- [ ] Multi-org user can switch organization context

### Organizations
- [ ] Owner org auto-created on registration
- [ ] Maintenance org created as PENDING_VALIDATION
- [ ] Directorate can CRUD installer/OMI companies + licenses
- [ ] Non-Directorate cannot create installer/OMI companies
- [ ] Municipality stored as FK (no free text)
- [ ] Org mutations audited

### Directorate
- [ ] Directorate CRUD companies and licenses
- [ ] ADMIN read-only access to company list and detail
- [ ] ADMIN blocked from create/edit routes
- [ ] License expiry visible in company list

### QKB Manual Validation
- [ ] Maintenance user can submit NIPT
- [ ] Admin can approve → ACTIVE + qkbValidated
- [ ] Admin can reject → SUSPENDED
- [ ] Pending org not in active selectors (service layer filter ready)
- [ ] QKB actions audited

### Route Protection
- [ ] Unauthenticated users redirected to login
- [ ] Role-restricted routes enforced
- [ ] Public routes remain accessible
- [ ] `/unauthorized` for cross-role access

### Tests & Build
- [ ] `npm run test` - 10/10 passing
- [ ] `npm run build` - success
- [ ] `npm run db:seed` - idempotent

---

## Explicitly NOT in Phase 2 (Phase 3)

- Applications workflow engine
- Elevator creation / digital file
- Certificates, QR codes
- Documents upload/storage
- Excel import
- Notifications engine (beyond audit)
- Maintenance / inspection operations

---

**On approval → Proceed to Phase 3: Applications & Workflow Engine**

# Phase 3 - Applications, Workflow Engine & Registration Lifecycle

**Status:** Complete - pending approval  
**Depends on:** Phase 2 (approved)

---

## Pre-Phase 3 Improvements (completed)

| # | Requirement | Implementation |
|---|-------------|----------------|
| 1 | `org_invitations` table + lifecycle | `OrgInvitation` model, `InvitationService`, `/auth/accept-invitation` |
| 2 | License-expiry suspension jobs | `license-expiry-job.ts`, `job-runner.ts`, `POST /api/cron/jobs` |
| 3 | Password reset: expiry + one-time use | `PasswordResetToken` model, hashed tokens in `AuthService` |
| 4 | Server-side `activeOrgId` validation | `validateUserOrgMembership()` in `requireAuth()` |
| 5 | Audit events | `VIEW_SENSITIVE_RECORD`, `DOWNLOAD_DOCUMENT` on `AuditService` |

---

## Phase 3 Deliverables

### Workflow Engine
- `src/lib/workflows/registration-workflow.ts` - state machine for `NEW_REGISTRATION`
- Workflow history recorded in `app_workflow_history`
- All transitions audited with `WORKFLOW_TRANSITION`

### Services
- `ApplicationService` - CRUD, transitions, access control, application numbering
- `ElevatorService` - creates elevator on approval (no QR/certificate generation)

### Permissions
- `applications.create`, `view_own`, `view_all`, `submit`, `assign_installer`
- `fill_technical`, `assign_certifier`, `upload_certification`, `review`, `approve`

### UI (Albanian)
| Route | Role | Purpose |
|-------|------|---------|
| `/portal/applications` | Owner/Installer/Certifier | List applications |
| `/portal/applications/new` | Owner | Create draft |
| `/portal/applications/[id]` | Portal roles | Role-specific workflow forms |
| `/ishmt/review` | Inspector | Review queue |
| `/ishmt/review/[id]` | Inspector | Approve / reject / return |

### Registration Flow
```
DRAFT → PENDING_INSTALLER → PENDING_CERTIFIER → PENDING_OWNER_SUBMISSION
→ SUBMITTED → UNDER_REVIEW → APPROVED (creates elevator) | REJECTED | RETURNED
```

### On Approval (implemented)
- Registry number: `ELV-{YEAR}-{MUN_CODE}-{SEQUENCE:6}`
- Elevator record (`ACTIVE`)
- Technical data + version 1
- Responsible entities (owner, installer, certifier)
- Delegation history

### Deferred (as requested)
- QR code generation
- Certificate PDF/module
- Document storage / upload
- Excel import

Certifier step uses metadata fields: `installationCertificateNumber`, `installationCertificateDate`, `certifierNotes`.

---

## Schema Additions
- `auth_password_reset_tokens`
- `org_invitations`
- `sys_application_sequences`
- `sys_job_runs`
- `ApplicationData` certification metadata fields
- `AuditAction`: `VIEW_SENSITIVE_RECORD`, `DOWNLOAD_DOCUMENT`

---

## Dev Verification

```bash
npm run db:push
npm run db:seed
npm run test
npm run typecheck
npm run build
```

### Manual test path
1. Login as `owner@example.al`
2. Create application → assign installer → login installer → fill technical + certifier
3. Login certifier → enter certificate metadata
4. Login owner → submit to ISHMT
5. Login `inspector@ishmtt.gov.al` → pickup → approve
6. Verify elevator created with registry number

### Cron job (dev)
```bash
curl -X POST http://localhost:3000/api/cron/jobs \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

---

## Approval Checklist

- [ ] Pre-Phase 3 improvements verified
- [ ] Full NEW_REGISTRATION workflow end-to-end
- [ ] No elevator without approved application
- [ ] Only ACTIVE licensed companies selectable
- [ ] Audit trail for views and transitions
- [ ] Tests and build pass

# Phase 1 - Project Scaffolding & Database Schema

**Status:** COMPLETE - Awaiting Approval  
**Date:** June 8, 2026

---

## 1. Architectural Decisions (Phase 1)

| Decision | Rationale | Architecture Reference |
|----------|-----------|------------------------|
| Modular monolith in single Next.js app | Government ops simplicity, ACID workflows | `03-technical-architecture.md` |
| `src/` directory with route groups | Separates public, portal, ISHMT, directorate portals | `03-technical-architecture.md` §3.1 |
| Prisma `@@map` to architecture table names | DB matches `06-database-design.md` exactly | `06-database-design.md` |
| `GeoMunicipality` FK replaces free-text municipality | Approved extension - no free-text municipality | Master implementation prompt |
| `Elevator.applicationId` NOT NULL + unique | RULE 1: no elevator without application | `02-functional-architecture.md` |
| `Application.elevatorId` optional | Links existing elevator for DEREG/CORRECTION/UPDATE/MODERNIZATION | `08-workflow-diagrams.md` |
| `elv_technical_data_versions` with `is_current` | Technical data never overwritten; modernization preserves history | Approved extension |
| `elv_ownership_history` append-only | Owner changes never overwrite historical ownership | Approved extension |
| `elv_delegation_history` | Tracks installer/certifier/maintenance assignments | Approved extension |
| `SuspensionReason` enum on status history | Structured suspension reasons | Approved extension |
| `MODERNIZATION` application type | New workflow for technical file updates | Approved extension |
| `mig_review_queue` before import | Admin resolves duplicates/missing data/unknown companies | Approved extension |
| `doc_templates` | ISHMT Admin template management | Approved extension |
| `elv_compliance_status` with GREEN/YELLOW/RED | Public QR compliance indicator | Approved extension |
| `sys_reminder_rules` + `sys_scheduled_reminders` | Reminder engine for 30/15/7/1 day notifications | Approved extension |
| Docker Compose: PostgreSQL 16 + MinIO | Approved stack | `03-technical-architecture.md` §8.1 |
| Next.js `standalone` output | Production Docker deployment | `Dockerfile` |

---

## 2. Folder Structure

```
ishmtt/
├── docker-compose.yml          # PostgreSQL 16 + MinIO (+ optional app profile)
├── Dockerfile                  # Production multi-stage build
├── .env.example                # All environment variables documented
├── components.json             # shadcn/ui configuration
├── prisma/
│   ├── schema.prisma           # Complete production schema (48 models)
│   └── seed.ts                 # Placeholder - full seed in Phase 2
├── docs/
│   ├── architecture/           # Approved architecture (13 documents)
│   └── implementation/
│       └── phase-1-scaffolding.md
├── public/
├── src/
│   ├── app/
│   │   ├── (public)/           # QR, reporting, auth (unauthenticated)
│   │   │   ├── auth/login/
│   │   │   ├── auth/register/
│   │   │   ├── q/[code]/
│   │   │   └── report/
│   │   ├── (portal)/           # Owner, installer, certifier, maintenance
│   │   │   ├── dashboard/
│   │   │   ├── applications/
│   │   │   ├── elevators/
│   │   │   ├── maintenance/
│   │   │   ├── inspections/
│   │   │   └── documents/
│   │   ├── (ishmt)/            # Inspector + admin
│   │   │   ├── review/
│   │   │   ├── inspect/
│   │   │   ├── reports/
│   │   │   └── admin/
│   │   │       ├── templates/
│   │   │       ├── import/
│   │   │       └── config/
│   │   ├── (directorate)/      # Installer/OMI company management
│   │   │   └── companies/
│   │   ├── api/
│   │   │   └── health/         # Health check endpoint
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui (Phase 2+)
│   │   ├── shared/
│   │   ├── forms/
│   │   └── layout/
│   ├── hooks/
│   ├── lib/
│   │   ├── audit/              # Audit interceptor (Phase 2)
│   │   ├── auth/               # NextAuth config (Phase 2)
│   │   ├── constants/
│   │   │   ├── roles.ts
│   │   │   └── compliance.ts
│   │   ├── permissions/        # RBAC guards (Phase 2)
│   │   ├── services/           # Domain services (Phase 3+)
│   │   ├── storage/            # MinIO abstraction (Phase 3+)
│   │   ├── validations/        # Zod schemas (Phase 2+)
│   │   ├── workflows/          # State machines (Phase 3)
│   │   ├── db.ts               # Prisma client singleton
│   │   └── utils.ts            # cn() utility for shadcn
│   ├── middleware.ts           # Auth middleware stub
│   └── types/
└── tests/
    ├── unit/
    └── integration/
```

---

## 3. Database Schema Summary

### 3.1 Model Count: 48 Prisma Models

| Domain | Models | Table Prefix |
|--------|--------|--------------|
| Geography | GeoRegion, GeoMunicipality, GeoAdministrativeUnit | `geo_` |
| Authentication | AuthUser, AuthRole, AuthPermission, AuthRolePermission, Account, Session, VerificationToken | `auth_` |
| Organizations | Organization, OrgMembership, OrganizationLicense, QkbValidation | `org_` |
| Applications | Application, ApplicationData, ApplicationWorkflowHistory | `app_` |
| Elevators | Elevator, ElevatorTechnicalData, ElevatorTechnicalDataVersion, ElevatorResponsibleEntity, ElevatorStatusHistory, ElevatorOwnershipHistory, ElevatorDelegationHistory, ElevatorComplianceStatus | `elv_` |
| Certificates | Certificate | `cert_` |
| QR Codes | QrCode, QrScanLog | `qr_` |
| Documents | Document, DocumentLink, DocumentAccessLog, DocumentTemplate | `doc_` |
| Maintenance | MaintenanceContract, MaintenanceRecord, MaintenanceComplianceStatus | `maint_` |
| Inspections | Inspection | `insp_` |
| Citizen Reports | CitizenReport, CitizenReportAction | `cit_` |
| Migration | MigrationBatch, MigrationStagingRecord, MigrationReviewQueueItem | `mig_` |
| System | Notification, NotificationPreference, NotificationTemplate, SystemConfig, RegistrySequence, ReminderRule, ScheduledReminder | `sys_` |
| Audit | AuditLog | `audit_` |

### 3.2 Enum Count: 28 Enums

All enums from architecture plus extensions:
- `ApplicationType` includes `MODERNIZATION`
- `SuspensionReason` (6 values)
- `ComplianceIndicator` (GREEN, YELLOW, RED)
- `DelegationType`, `DelegationStatus`
- `MigrationReviewStatus`, `MigrationReviewIssueType`
- `TemplateType`, `ReminderEntityType`

### 3.3 Critical Business Rule Enforcement in Schema

| Rule | Schema Enforcement |
|------|-------------------|
| RULE 1: No elevator without application | `Elevator.applicationId` - required, unique, FK to Application |
| RULE 2/3: Directorate-managed companies | Enforced in application layer; `Organization.type` enum restricts INSTALLER/CERTIFIER |
| RULE 5: Audit everything | `AuditLog` model - append-only design |
| RULE 6: Document access logged | `DocumentAccessLog` model |
| RULE 7: Workflow transitions recorded | `ApplicationWorkflowHistory` model |
| RULE 8: Import → PENDING_CONFIRMATION | `ElevatorStatus.PENDING_CONFIRMATION` enum + `migrationBatchId` FK |

---

## 4. ERD Validation Checklist

### 4.1 Architecture Alignment

| Architecture Entity | Prisma Model | Status |
|--------------------|--------------|--------|
| auth_users | AuthUser | ✅ |
| auth_roles | AuthRole | ✅ |
| auth_permissions | AuthPermission | ✅ |
| auth_role_permissions | AuthRolePermission | ✅ |
| org_organizations | Organization | ✅ (+ municipalityId FK) |
| org_memberships | OrgMembership | ✅ |
| org_licenses | OrganizationLicense | ✅ |
| org_qkb_validations | QkbValidation | ✅ |
| app_applications | Application | ✅ (+ MODERNIZATION type) |
| app_application_data | ApplicationData | ✅ (+ municipalityId FK) |
| app_workflow_history | ApplicationWorkflowHistory | ✅ |
| elv_elevators | Elevator | ✅ (+ municipalityId FK) |
| elv_technical_data | ElevatorTechnicalData | ✅ |
| elv_responsible_entities | ElevatorResponsibleEntity | ✅ |
| elv_status_history | ElevatorStatusHistory | ✅ (+ suspensionReason) |
| cert_certificates | Certificate | ✅ |
| qr_codes | QrCode | ✅ |
| qr_scan_logs | QrScanLog | ✅ |
| doc_documents | Document | ✅ |
| doc_document_links | DocumentLink | ✅ |
| doc_access_log | DocumentAccessLog | ✅ |
| maint_contracts | MaintenanceContract | ✅ |
| maint_records | MaintenanceRecord | ✅ |
| maint_compliance_status | MaintenanceComplianceStatus | ✅ |
| insp_inspections | Inspection | ✅ |
| cit_reports | CitizenReport | ✅ (+ municipalityId FK) |
| cit_report_actions | CitizenReportAction | ✅ |
| mig_batches | MigrationBatch | ✅ |
| mig_staging_records | MigrationStagingRecord | ✅ |
| sys_notifications | Notification | ✅ |
| sys_config | SystemConfig | ✅ |
| audit_logs | AuditLog | ✅ |

### 4.2 Approved Extensions

| Extension | Prisma Model | Status |
|-----------|--------------|--------|
| Ownership history | ElevatorOwnershipHistory | ✅ |
| Delegation history | ElevatorDelegationHistory | ✅ |
| Suspension reasons | SuspensionReason enum on ElevatorStatusHistory | ✅ |
| MODERNIZATION workflow | ApplicationType.MODERNIZATION | ✅ |
| Technical data versioning | ElevatorTechnicalDataVersion | ✅ |
| Compliance indicator | ElevatorComplianceStatus | ✅ |
| Reminder engine | ReminderRule, ScheduledReminder | ✅ |
| Municipality registry | GeoRegion, GeoMunicipality, GeoAdministrativeUnit | ✅ |
| Migration review queue | MigrationReviewQueueItem | ✅ |
| Document templates | DocumentTemplate | ✅ |
| Registry sequences | RegistrySequence | ✅ |
| Notification templates | NotificationTemplate | ✅ |
| Notification preferences | NotificationPreference | ✅ |

### 4.3 Key Relationships Validated

| Relationship | Cardinality | Validated |
|-------------|-------------|-----------|
| Application → Elevator (origin) | 1:0..1 | ✅ `Elevator.applicationId` unique |
| Application → Elevator (target) | N:0..1 | ✅ `Application.elevatorId` optional |
| Elevator → TechnicalData | 1:1 | ✅ |
| Elevator → TechnicalDataVersions | 1:N | ✅ with `is_current` flag |
| Elevator → OwnershipHistory | 1:N | ✅ append-only |
| Elevator → DelegationHistory | 1:N | ✅ |
| Organization → Municipality | N:1 | ✅ FK, no free text |
| MigrationBatch → ReviewQueue | 1:N | ✅ pre-import review |
| Certificate ↔ Inspection | N:1 | ✅ bidirectional optional |

---

## 5. Infrastructure

### 5.1 Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| db | postgres:16-alpine | 5432 | Primary database |
| minio | minio/minio | 9000, 9001 | Document storage |
| minio-init | minio/mc | - | Bucket creation |
| app | Custom Dockerfile | 3000 | Production (profile: production) |

### 5.2 Quick Start

```bash
# Copy environment
cp .env.example .env

# Start infrastructure
npm run docker:up

# Install dependencies
npm install

# Validate schema
npm run validate:schema

# Push schema to database
npm run db:push

# Start development server
npm run dev
```

### 5.3 Environment Variables

See `.env.example` - 20+ documented variables covering database, auth, storage, QR, email, reminders, rate limiting.

---

## 6. What Is NOT Included (By Design)

Per implementation strategy - Phase 1 stops here:

| Item | Phase |
|------|-------|
| Authentication (NextAuth) | Phase 2 |
| Authorization (RBAC guards) | Phase 2 |
| Organizations module | Phase 2 |
| Application workflow engine | Phase 3 |
| Server Actions | Phase 2+ |
| UI pages (beyond placeholder) | Phase 2+ |
| Zod validation schemas | Phase 2+ |
| Domain services | Phase 3+ |
| Tests | Phase 2+ |
| shadcn/ui components | Phase 2+ |
| Seed data | Phase 2 |

---

## 7. Approval Request

Please review and approve:

- [ ] Folder structure matches architecture
- [ ] Prisma schema covers all 48 models and 28 enums
- [ ] Business RULE 1 enforced (`applicationId` NOT NULL on Elevator)
- [ ] Approved extensions integrated (ownership, delegation, versioning, compliance, reminders, geography, migration review, templates)
- [ ] Docker Compose configuration
- [ ] Environment variable documentation
- [ ] No free-text municipality fields (FK to `geo_municipalities`)

**On approval → Proceed to Phase 2: Authentication, Authorization, Organizations**

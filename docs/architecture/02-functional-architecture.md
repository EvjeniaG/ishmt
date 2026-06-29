# Functional Architecture

## 1. System Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ISHMT DIGITAL ELEVATOR REGISTRY                       │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Application │  │   Elevator   │  │  Compliance  │  │   Citizen    │    │
│  │   Workflow   │  │ Digital File │  │  Operations  │  │   Services   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Directorate │  │   Document   │  │ Notification │  │   Reporting  │    │
│  │    Admin     │  │  Management  │  │   Engine     │  │  & Analytics │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │                    │
         ▼                    ▼                    ▼                    ▼
   ┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
   │ e-Albania│        │   QKB    │        │Directorate│       │e-Inspection│
   │ (future) │        │ (future) │        │ Licensing │       │  (future)  │
   └──────────┘        └──────────┘        └──────────┘        └──────────┘
```

## 2. Functional Domains

### 2.1 Identity & Access Management

| Function | Description |
|----------|-------------|
| User registration | Self-registration for owners; admin-provisioned for ISHMT staff |
| Authentication | Email/password (Phase 1); e-Albania OIDC (Phase 2) |
| Role assignment | RBAC with organization-scoped permissions |
| Organization membership | Users belong to one or more organizations with roles |
| Session management | Secure sessions with MFA for admin/inspector roles (Phase 2) |

### 2.2 Organization Management

| Organization Type | Management Model |
|-------------------|------------------|
| ISHMT (Government) | System-managed, immutable |
| Directorate | System-managed government unit |
| Installation Company | **Preloaded and maintained by Directorate only** |
| Certification Company / OMI | **Preloaded and maintained by Directorate only** |
| Maintenance Company | Self-registration with **mandatory QKB validation** |
| Owner Entity | Self-managed (individual or legal entity) |

**Critical Rule:** Installer and OMI companies cannot self-register. Only `ACTIVE` licensed companies appear in selection dropdowns during applications.

### 2.3 Application Management (Pre-Elevator)

Applications are the entry point for all elevator lifecycle events that create or modify registry records.

| Application Type | Purpose | Creates Elevator? |
|------------------|---------|-------------------|
| `NEW_REGISTRATION` | First-time elevator registration | Yes (on approval) |
| `DEREGISTRATION` | Remove elevator from active registry | No (status change) |
| `DATA_CORRECTION` | Fix erroneous registered data | No (field correction) |
| `DATA_UPDATE` | Update legitimately changed data (owner transfer, maintenance company change) | No (field update) |

#### Application State Machine

```
DRAFT
  → PENDING_INSTALLER (owner assigned installer)
    → PENDING_CERTIFIER (installer completed, certifier assigned)
      → PENDING_OWNER_SUBMISSION (certifier uploaded certificate)
        → SUBMITTED (owner submitted to ISHMT)
          → UNDER_REVIEW (inspector assigned)
            → APPROVED | REJECTED | RETURNED_FOR_CORRECTION
              → (if APPROVED for NEW_REGISTRATION) → ELEVATOR_CREATED
```

**Returned for correction** loops back to the responsible party based on rejection reason.

### 2.4 Elevator Digital File

Created **only** upon approval of a `NEW_REGISTRATION` application.

| Sub-domain | Functions |
|------------|-----------|
| Registration | Registry number, registration date, municipality, address, building |
| Technical | Type, capacity, speed, floors served, manufacturer, year, serial number |
| Responsible entities | Owner, installer, certifier, maintenance company (with validity periods) |
| Status management | Active, suspended, deregistered, pending_confirmation (migrated) |
| History | Immutable status change log with reason and authorizing application |

### 2.5 Certificate Management

| Certificate Type | Issued By | Trigger |
|------------------|-----------|---------|
| Installation Certificate | OMI/Certifier | During application workflow |
| Registration Certificate | ISHMT (system-generated) | On elevator activation |
| Periodic Inspection Certificate | ISHMT Inspector | After passed inspection |
| Conformity Certificate | OMI/Certifier | Re-certification events |

Certificates are PDF documents with unique numbers, digital signatures (Phase 2), and expiry dates.

### 2.6 QR Code Public Profile

| Aspect | Design |
|--------|--------|
| Generation | Auto-generated on elevator activation |
| Content | URL to public profile page |
| Public data | Registry number, status, last inspection date, maintenance compliance indicator |
| Private data | Owner contact, full technical specs, documents - **not** on public profile |
| Regeneration | On deregistration (deactivated); on re-activation (new QR) |

### 2.7 Maintenance Lifecycle

```
Maintenance Company Assigned (via application or update)
  → Maintenance Contract Registered
    → Periodic Maintenance Records Logged
      → Compliance Status Calculated
        → Non-Compliance Flag (if overdue)
          → ISHMT Notification
```

| Rule | Detail |
|------|--------|
| Company validation | Maintenance company must pass QKB validation before assignment |
| Record frequency | Configurable per elevator type (default: monthly log, annual service) |
| Compliance window | System calculates days since last maintenance vs. required interval |
| Escalation | Auto-flag after configurable grace period |

### 2.8 Inspection Lifecycle

```
Inspection Scheduled (by ISHMT Inspector)
  → Inspection Conducted
    → Result Recorded (PASS | FAIL | CONDITIONAL)
      → Certificate Issued (if PASS)
        → Next Inspection Date Set
          → Expiry Monitoring
```

| Inspection Type | Frequency |
|-----------------|-----------|
| Initial | Part of registration approval |
| Periodic | Per regulatory schedule (configurable) |
| Extraordinary | Triggered by citizen report or incident |
| Re-inspection | After failed inspection within deadline |

### 2.9 Citizen Reporting

Anonymous and authenticated reporting channels:

| Report Type | Workflow |
|-------------|----------|
| Elevator without QR | Citizen submits location/photo → ISHMT triage queue → Investigation |
| Safety issue | Priority queue → Inspector assignment → Linked to elevator if identified |
| General complaint | Standard queue → Review → Resolution with citizen notification |

Reports do **not** modify elevator records directly. They create investigation cases.

### 2.10 Directorate Administration

Exclusive functions for Directorate of Internal Market Policies:

- CRUD for Installation Companies (with license number, validity, status)
- CRUD for Certification Companies / OMI (with accreditation scope)
- License expiry monitoring and deactivation
- Bulk license renewal processing
- Audit of all company registry changes

### 2.11 Document Management

| Document Category | Access Level |
|-------------------|--------------|
| Application documents | Workflow participants + ISHMT |
| Certificates | Owner + ISHMT + public summary via QR |
| Technical drawings | Owner + installer + ISHMT |
| Inspection reports | ISHMT + owner (summary) |
| Maintenance logs | Maintenance company + owner + ISHMT |
| Internal ISHMT notes | ISHMT only |

### 2.12 Notification Engine

| Event | Recipients |
|-------|------------|
| Application status change | All workflow participants |
| Assignment (installer/certifier) | Assigned party |
| Certificate expiry (30/15/7 days) | Owner + maintenance company |
| Inspection due | Owner + ISHMT inspector (regional) |
| Maintenance non-compliance | Owner + maintenance company + ISHMT |
| Citizen report resolution | Reporting citizen (if authenticated) |

Channels: In-app (Phase 1), Email (Phase 1), SMS via e-Albania (Phase 2).

### 2.13 Reporting & Dashboards

#### Operational Reports
- Applications by status and age
- Pending reviews by inspector
- Overdue workflow steps

#### Regulatory Reports
- Total elevators by municipality and status
- Certificate compliance rates
- Inspection completion rates
- Maintenance compliance rates
- Deregistration statistics

#### Dashboard Metrics
- Active elevators count
- Pending applications
- Expiring certificates (30-day window)
- Missing/overdue inspections
- Maintenance non-compliance count
- Citizen reports open/priority

### 2.14 Excel Migration

See dedicated document: `10-migration-design.md`

Functional capabilities:
1. Upload Excel file(s)
2. Schema validation against expected columns
3. Column mapping (flexible header matching)
4. Staging area with preview
5. Duplicate detection (fuzzy match on address + serial + building)
6. Conflict resolution UI
7. Batch import with transaction boundaries
8. Rollback of import batch
9. Imported elevators → `PENDING_CONFIRMATION` status

## 3. Cross-Cutting Functional Concerns

### 3.1 Audit Trail

Every mutation records:
- Actor (user ID)
- Action type (CREATE, UPDATE, DELETE, STATUS_CHANGE, DOCUMENT_ACCESS)
- Entity type and ID
- Before/after snapshot (JSON)
- Timestamp (UTC)
- IP address
- Correlation ID (workflow/application context)

### 3.2 Soft Delete

- No hard deletes on registry entities
- `deleted_at` timestamp on all primary entities
- Deleted records excluded from active queries but retained for audit
- Only ISHMT Administrator can soft-delete; no purge in Phase 1

### 3.3 Configurable Business Rules

Stored in `system_config` table (admin-managed):

| Parameter | Example |
|-----------|---------|
| Maintenance interval days | 30 |
| Inspection interval months | 12 |
| Certificate expiry warning days | 30, 15, 7 |
| Application auto-expiry days | 90 |
| QR base URL | `https://elevator.ishmt.gov.al/q/` |

## 4. Functional Boundaries (Out of Scope Phase 1)

- Payment processing for registration fees
- Mobile native apps
- Real-time IoT elevator monitoring
- GIS/mapping integration
- Multi-language (Albanian only in Phase 1; English in Phase 3)

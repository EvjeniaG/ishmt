# Module Breakdown

## Module Dependency Map

```
                    ┌─────────────────┐
                    │  Authentication  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Authorization  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │Organizations│  │    Users   │  │  Audit Logs│
     └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
            │               │              │
            └───────┬───────┘              │
                    ▼                      │
           ┌────────────────┐              │
           │  Applications  │◄─────────────┤
           └───────┬────────┘              │
                   │                       │
         ┌─────────┼─────────┐            │
         ▼         ▼         ▼            │
  ┌──────────┐ ┌────────┐ ┌──────────┐   │
  │Elevators │ │Documents│ │Notificat.│◄──┘
  └────┬─────┘ └───┬────┘ └──────────┘
       │           │
  ┌────┼─────┬─────┼─────┬──────────┐
  ▼    ▼     ▼     ▼     ▼          ▼
┌────┐┌────┐┌────┐┌────┐┌────────┐┌────────┐
│Cert││ QR ││Maint││Insp││Citizen ││Reporting│
└────┘└────┘└────┘└────┘│Report  │└────────┘
                        └────────┘
  ┌────────────┐  ┌────────────┐
  │Excel Import│  │Directorate │
  └────────────┘  │   Admin    │
                  └────────────┘
```

---

## Module Specifications

### M01 - Authentication

| Attribute | Detail |
|-----------|--------|
| **Purpose** | User identity verification and session management |
| **Phase** | 1 |
| **Dependencies** | Users module, PostgreSQL |

**Capabilities:**
- Email/password registration and login
- Password reset via email
- Session management (JWT)
- Account lockout after failed attempts
- e-Albania OIDC provider (Phase 2 adapter slot)

**Key Entities:** `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verification_tokens`

---

### M02 - Authorization

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Role-based and organization-scoped access control |
| **Phase** | 1 |
| **Dependencies** | Authentication, Users, Organizations |

**Capabilities:**
- Role definitions (8 user types)
- Permission matrix enforcement
- Organization-scoped data filtering (Prisma middleware)
- Route-level middleware guards
- Action-level permission checks in domain services
- Document-level access control

**Key Entities:** `auth_roles`, `auth_permissions`, `auth_role_permissions`

---

### M03 - Organizations

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Manage all organizational entities in the system |
| **Phase** | 1 |
| **Dependencies** | Authorization, Audit |

**Capabilities:**
- Organization CRUD (type-specific rules)
- Organization membership management
- License tracking (installer, OMI)
- QKB validation status (maintenance companies)
- Organization status lifecycle (ACTIVE, SUSPENDED, REVOKED)
- Search and filter by type, status, municipality

**Key Entities:** `org_organizations`, `org_memberships`, `org_licenses`, `org_qkb_validations`

**Business Rules:**
- Installer/OMI: Directorate-managed only
- Maintenance: Self-register + QKB validation required
- Owner: Self-managed entity

---

### M04 - Users

| Attribute | Detail |
|-----------|--------|
| **Purpose** | User profile and account management |
| **Phase** | 1 |
| **Dependencies** | Authentication, Organizations |

**Capabilities:**
- User profile CRUD
- Organization assignment
- Role assignment (per organization)
- User activation/deactivation
- ISHMT staff provisioning by admin

**Key Entities:** `auth_users`, `org_memberships`

---

### M05 - Applications

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Workflow-driven application processing (pre-elevator) |
| **Phase** | 1 |
| **Dependencies** | Organizations, Users, Documents, Notifications, Audit, Workflow Engine |

**Capabilities:**
- Create application (4 types)
- Multi-party data entry (owner → installer → certifier)
- Workflow state transitions with guards
- Assignment management (installer, certifier, inspector)
- Submission to ISHMT
- Review, approval, rejection, return for correction
- Application history and timeline view
- Auto-expiry of stale drafts

**Key Entities:** `app_applications`, `app_application_data`, `app_workflow_history`, `app_assignments`

**This is the most complex module - it orchestrates the registration, deregistration, correction, and update workflows.**

---

### M06 - Elevators

| Attribute | Detail |
|-----------|--------|
| **Purpose** | National elevator registry (Digital File) |
| **Phase** | 1 |
| **Dependencies** | Applications, Organizations, Certificates, QR, Documents, Audit |

**Capabilities:**
- Elevator creation (triggered by approved NEW_REGISTRATION only)
- Registry number generation (format: `ELV-{YEAR}-{MUNICIPALITY_CODE}-{SEQUENCE}`)
- Technical data management
- Responsible entity assignment with validity periods
- Status management (ACTIVE, SUSPENDED, DEREGISTERED, PENDING_CONFIRMATION)
- Status history tracking
- Digital File aggregated view
- Search and filter (municipality, status, owner, company)

**Key Entities:** `elv_elevators`, `elv_technical_data`, `elv_responsible_entities`, `elv_status_history`

**Critical Rule:** No direct elevator creation API. Only workflow side-effect.

---

### M07 - Certificates

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Certificate issuance, tracking, and expiry management |
| **Phase** | 1 |
| **Dependencies** | Elevators, Applications, Documents |

**Capabilities:**
- Certificate upload (OMI during application)
- Certificate generation (ISHMT registration certificate on activation)
- Certificate number assignment
- Expiry date tracking
- Expiry notification triggers
- Certificate PDF storage
- Certificate revocation
- Certificate history per elevator

**Key Entities:** `cert_certificates`, `cert_certificate_types`

---

### M08 - QR Codes

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Public elevator identification and profile access |
| **Phase** | 1 |
| **Dependencies** | Elevators |

**Capabilities:**
- QR code generation on activation (UUID-based short code)
- QR image generation (PNG/SVG)
- Public profile page (no auth required)
- QR deactivation on deregistration
- QR regeneration on re-activation
- Scan analytics (count, no PII)

**Key Entities:** `qr_codes`, `qr_scan_logs`

---

### M09 - Documents

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Secure document upload, storage, and access control |
| **Phase** | 1 |
| **Dependencies** | Storage abstraction, Authorization, Audit |

**Capabilities:**
- Multi-file upload with drag-and-drop
- Document classification (type, category)
- Version tracking
- Access-controlled download
- Checksum verification
- Document linking (to application, elevator, inspection, etc.)
- Bulk document export (ISHMT)

**Key Entities:** `doc_documents`, `doc_document_links`, `doc_access_log`

---

### M10 - Maintenance

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Maintenance company management and compliance tracking |
| **Phase** | 1 (basic), 2 (full compliance engine) |
| **Dependencies** | Elevators, Organizations, Notifications |

**Capabilities:**
- Maintenance company assignment to elevator
- Maintenance contract registration
- Maintenance record logging (date, type, technician, findings)
- Compliance calculation (days since last maintenance)
- Non-compliance flagging
- Maintenance history per elevator
- Maintenance company dashboard (assigned elevators, due records)

**Key Entities:** `maint_contracts`, `maint_records`, `maint_compliance_status`

---

### M11 - Inspections

| Attribute | Detail |
|-----------|--------|
| **Purpose** | ISHMT inspection scheduling, execution, and certification |
| **Phase** | 1 |
| **Dependencies** | Elevators, Certificates, Users, Documents |

**Capabilities:**
- Inspection scheduling (by inspector)
- Inspection types (initial, periodic, extraordinary, re-inspection)
- Inspection result recording (PASS, FAIL, CONDITIONAL)
- Inspection report upload
- Certificate issuance on PASS
- Next inspection date calculation
- Overdue inspection detection
- Regional inspector assignment

**Key Entities:** `insp_inspections`, `insp_results`, `insp_schedules`

---

### M12 - Notifications

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Multi-channel notification delivery |
| **Phase** | 1 (in-app + email), 2 (SMS) |
| **Dependencies** | Users |

**Capabilities:**
- In-app notification center
- Email notifications (transactional)
- Notification templates (configurable)
- Event-driven triggers (workflow, expiry, compliance)
- Read/unread tracking
- Notification preferences per user
- Batch notification processing

**Key Entities:** `sys_notifications`, `sys_notification_templates`, `sys_notification_preferences`

---

### M13 - Audit Logs

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Immutable record of all system actions |
| **Phase** | 1 |
| **Dependencies** | None (cross-cutting) |

**Capabilities:**
- Automatic capture via service layer interceptor
- Before/after JSON snapshots
- Actor, timestamp, IP, correlation ID
- Entity-level audit trail view
- System-wide audit search (admin)
- Export for compliance review
- Append-only (no update/delete)

**Key Entities:** `audit_logs`

---

### M14 - Reporting

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Operational, regulatory, and dashboard reporting |
| **Phase** | 1 (basic), 2 (advanced), 3 (analytics) |
| **Dependencies** | All data modules |

**Capabilities:**
- Dashboard with KPI widgets
- Operational reports (applications, workflows)
- Regulatory reports (compliance, municipality breakdown)
- Export to PDF and Excel
- Scheduled report generation (Phase 2)
- Custom report builder (Phase 3)

**Key Entities:** Report queries (no dedicated tables; reads from domain tables + `sys_report_cache` in Phase 2)

---

### M15 - Excel Import

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Legacy data migration from Excel files |
| **Phase** | 1 |
| **Dependencies** | Elevators, Organizations, Audit |

**Capabilities:**
- Excel file upload (.xlsx, .xls)
- Column mapping configuration
- Validation rules engine
- Staging table population
- Duplicate detection (configurable matching rules)
- Conflict resolution UI
- Preview before import
- Batch import with transaction
- Rollback entire batch
- Import audit trail

**Key Entities:** `mig_batches`, `mig_staging_records`, `mig_mapping_configs`, `mig_duplicates`

---

### M16 - Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Role-specific landing page with actionable metrics |
| **Phase** | 1 |
| **Dependencies** | Reporting, Notifications, Applications, Elevators |

**Role-specific dashboards:**

| Role | Key Widgets |
|------|-------------|
| Owner | My applications, my elevators, pending actions, expiring certificates |
| Installer | Assigned applications, pending data entry |
| Certifier/OMI | Assigned applications, pending certifications |
| Maintenance | Assigned elevators, due maintenance, compliance status |
| ISHMT Inspector | Review queue, scheduled inspections, overdue items, citizen reports |
| ISHMT Admin | System health, user stats, import status, audit summary |
| Directorate | Company registry stats, license expiries |
| Public | N/A (no dashboard; QR lookup and reporting only) |

---

### M17 - Directorate Administration

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Exclusive management of installer and OMI company registry |
| **Phase** | 1 |
| **Dependencies** | Organizations, Audit |

**Capabilities:**
- Add/edit/deactivate installation companies
- Add/edit/deactivate OMI/certification companies
- License number and validity management
- Accreditation scope definition
- Bulk import of company registry
- License expiry alerts
- Company audit history

**Key Entities:** Uses `org_organizations` + `org_licenses` with Directorate-scoped access

---

### M18 - Citizen Reporting

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Public safety reporting and complaint management |
| **Phase** | 1 |
| **Dependencies** | Elevators (optional link), Notifications, Audit |

**Capabilities:**
- Anonymous report submission (no auth required)
- Authenticated report submission (tracked)
- Report types: no QR, safety issue, complaint
- Photo upload (optional)
- Location capture (address + optional GPS)
- ISHMT triage queue
- Report assignment to inspector
- Investigation workflow
- Resolution with optional citizen notification
- Link to elevator if identified

**Key Entities:** `cit_reports`, `cit_report_actions`, `cit_report_attachments`

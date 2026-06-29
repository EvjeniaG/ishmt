# Database Design

## 1. Design Principles

| Principle | Implementation |
|-----------|----------------|
| UUID primary keys | All tables use `uuid` PK for distributed safety |
| Timestamps | `created_at`, `updated_at` on all tables (UTC) |
| Soft delete | `deleted_at` nullable timestamp on primary entities |
| Audit | Append-only `audit_logs` table; no mutation on audit records |
| Referential integrity | Foreign keys with appropriate `ON DELETE` rules |
| No elevator without application | `elv_elevators.application_id` is NOT NULL |
| Immutable workflow history | `app_workflow_history` is append-only |
| Status as enum | PostgreSQL native enums for status fields |

## 2. Enum Definitions

```sql
-- Organization
CREATE TYPE org_type AS ENUM (
  'ISHMT', 'DIRECTORATE', 'INSTALLER', 'CERTIFIER', 'MAINTENANCE', 'OWNER'
);
CREATE TYPE org_status AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'PENDING_VALIDATION');

-- Application
CREATE TYPE app_type AS ENUM (
  'NEW_REGISTRATION', 'DEREGISTRATION', 'DATA_CORRECTION', 'DATA_UPDATE'
);
CREATE TYPE app_status AS ENUM (
  'DRAFT', 'PENDING_INSTALLER', 'PENDING_CERTIFIER',
  'PENDING_OWNER_SUBMISSION', 'SUBMITTED', 'UNDER_REVIEW',
  'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED', 'EXPIRED'
);

-- Elevator
CREATE TYPE elv_status AS ENUM (
  'PENDING_CONFIRMATION', 'ACTIVE', 'SUSPENDED', 'DEREGISTERED'
);
CREATE TYPE elv_type AS ENUM (
  'PASSENGER', 'FREIGHT', 'SERVICE', 'HANDICAPPED', 'ESCALATOR', 'MOVING_WALK'
);

-- Certificate
CREATE TYPE cert_type AS ENUM (
  'INSTALLATION', 'REGISTRATION', 'PERIODIC_INSPECTION', 'CONFORMITY'
);
CREATE TYPE cert_status AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'SUPERSEDED');

-- Inspection
CREATE TYPE insp_type AS ENUM ('INITIAL', 'PERIODIC', 'EXTRAORDINARY', 'RE_INSPECTION');
CREATE TYPE insp_result AS ENUM ('PASS', 'FAIL', 'CONDITIONAL', 'PENDING');

-- Maintenance
CREATE TYPE maint_type AS ENUM ('ROUTINE', 'ANNUAL_SERVICE', 'EMERGENCY', 'MODERNIZATION');

-- Citizen Report
CREATE TYPE cit_report_type AS ENUM ('NO_QR', 'SAFETY_ISSUE', 'COMPLAINT');
CREATE TYPE cit_report_status AS ENUM (
  'SUBMITTED', 'TRIAGED', 'ASSIGNED', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'
);

-- Document
CREATE TYPE doc_classification AS ENUM (
  'APPLICATION', 'TECHNICAL', 'CERTIFICATE', 'INSPECTION_REPORT',
  'MAINTENANCE_LOG', 'INTERNAL_ISHMT', 'CITIZEN_REPORT', 'OTHER'
);

-- Migration
CREATE TYPE mig_batch_status AS ENUM (
  'UPLOADED', 'VALIDATING', 'STAGED', 'REVIEWING', 'IMPORTING',
  'COMPLETED', 'FAILED', 'ROLLED_BACK'
);

-- Notification
CREATE TYPE notif_channel AS ENUM ('IN_APP', 'EMAIL', 'SMS');
CREATE TYPE notif_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- Audit
CREATE TYPE audit_action AS ENUM (
  'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE',
  'DOCUMENT_UPLOAD', 'DOCUMENT_DOWNLOAD', 'LOGIN', 'LOGOUT',
  'WORKFLOW_TRANSITION', 'IMPORT', 'ROLLBACK'
);
```

## 3. Table Definitions

### 3.1 Authentication & Authorization

#### `auth_users`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NULL (null for e-Albania users) |
| first_name | VARCHAR(100) | NOT NULL |
| last_name | VARCHAR(100) | NOT NULL |
| phone | VARCHAR(20) | NULL |
| nid | VARCHAR(20) | UNIQUE, NULL (National ID for e-Albania) |
| is_active | BOOLEAN | DEFAULT true |
| email_verified | BOOLEAN | DEFAULT false |
| last_login_at | TIMESTAMPTZ | NULL |
| failed_login_count | INTEGER | DEFAULT 0 |
| locked_until | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |
| deleted_at | TIMESTAMPTZ | NULL |

**Indexes:** `idx_auth_users_email`, `idx_auth_users_nid`, `idx_auth_users_active` (partial: `WHERE deleted_at IS NULL`)

#### `auth_roles`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| code | VARCHAR(50) | UNIQUE, NOT NULL |
| name | VARCHAR(100) | NOT NULL |
| description | TEXT | NULL |

Seed data: PUBLIC, OWNER, INSTALLER, CERTIFIER, MAINTENANCE, INSPECTOR, ADMIN, DIRECTORATE

#### `auth_permissions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| code | VARCHAR(100) | UNIQUE, NOT NULL |
| module | VARCHAR(50) | NOT NULL |
| action | VARCHAR(50) | NOT NULL |
| description | TEXT | NULL |

#### `auth_role_permissions`
| Column | Type | Constraints |
|--------|------|-------------|
| role_id | UUID | FK → auth_roles.id |
| permission_id | UUID | FK → auth_permissions.id |
| | | PK (role_id, permission_id) |

#### `auth_sessions` (NextAuth managed)
Managed by NextAuth adapter tables.

---

### 3.2 Organizations

#### `org_organizations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| type | org_type | NOT NULL |
| name | VARCHAR(255) | NOT NULL |
| nipt | VARCHAR(20) | UNIQUE, NULL (tax ID) |
| legal_form | VARCHAR(100) | NULL |
| address | TEXT | NULL |
| municipality | VARCHAR(100) | NULL |
| phone | VARCHAR(20) | NULL |
| email | VARCHAR(255) | NULL |
| status | org_status | DEFAULT 'ACTIVE' |
| qkb_validated | BOOLEAN | DEFAULT false |
| qkb_validated_at | TIMESTAMPTZ | NULL |
| qkb_validation_data | JSONB | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |
| deleted_at | TIMESTAMPTZ | NULL |
| created_by | UUID | FK → auth_users.id |

**Indexes:** `idx_org_type_status`, `idx_org_nipt`, `idx_org_municipality`, `idx_org_active` (partial)

#### `org_memberships`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → auth_users.id, NOT NULL |
| organization_id | UUID | FK → org_organizations.id, NOT NULL |
| role_id | UUID | FK → auth_roles.id, NOT NULL |
| is_primary | BOOLEAN | DEFAULT false |
| joined_at | TIMESTAMPTZ | DEFAULT now() |
| deactivated_at | TIMESTAMPTZ | NULL |

**Indexes:** `idx_membership_user`, `idx_membership_org`, UNIQUE `uq_user_org_role` (user_id, organization_id, role_id)

#### `org_licenses`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → org_organizations.id, NOT NULL |
| license_number | VARCHAR(50) | NOT NULL |
| license_type | VARCHAR(50) | NOT NULL |
| issued_date | DATE | NOT NULL |
| expiry_date | DATE | NOT NULL |
| scope | TEXT | NULL (accreditation scope for OMI) |
| status | org_status | DEFAULT 'ACTIVE' |
| issued_by | VARCHAR(255) | NULL |
| document_id | UUID | FK → doc_documents.id, NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |
| created_by | UUID | FK → auth_users.id |

**Indexes:** `idx_license_org`, `idx_license_expiry`, `idx_license_number`

#### `org_qkb_validations`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| organization_id | UUID | FK → org_organizations.id, NOT NULL |
| nipt | VARCHAR(20) | NOT NULL |
| request_data | JSONB | NULL |
| response_data | JSONB | NULL |
| status | VARCHAR(20) | NOT NULL (PENDING, VALID, INVALID, ERROR) |
| validated_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| initiated_by | UUID | FK → auth_users.id |

---

### 3.3 Applications

#### `app_applications`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| application_number | VARCHAR(30) | UNIQUE, NOT NULL |
| type | app_type | NOT NULL |
| status | app_status | DEFAULT 'DRAFT' |
| owner_org_id | UUID | FK → org_organizations.id, NOT NULL |
| installer_org_id | UUID | FK → org_organizations.id, NULL |
| certifier_org_id | UUID | FK → org_organizations.id, NULL |
| elevator_id | UUID | FK → elv_elevators.id, NULL (for non-registration types) |
| assigned_inspector_id | UUID | FK → auth_users.id, NULL |
| submitted_at | TIMESTAMPTZ | NULL |
| reviewed_at | TIMESTAMPTZ | NULL |
| approved_at | TIMESTAMPTZ | NULL |
| rejected_at | TIMESTAMPTZ | NULL |
| rejection_reason | TEXT | NULL |
| return_reason | TEXT | NULL |
| return_to_role | VARCHAR(50) | NULL |
| expires_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |
| deleted_at | TIMESTAMPTZ | NULL |
| created_by | UUID | FK → auth_users.id, NOT NULL |

**Indexes:** `idx_app_status`, `idx_app_type`, `idx_app_owner`, `idx_app_installer`, `idx_app_certifier`, `idx_app_inspector`, `idx_app_number`, `idx_app_active` (partial)

#### `app_application_data`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| application_id | UUID | FK → app_applications.id, UNIQUE, NOT NULL |
| building_address | TEXT | NULL |
| building_municipality | VARCHAR(100) | NULL |
| building_name | VARCHAR(255) | NULL |
| gps_latitude | DECIMAL(10,7) | NULL |
| gps_longitude | DECIMAL(10,7) | NULL |
| elevator_type | elv_type | NULL |
| manufacturer | VARCHAR(255) | NULL |
| model | VARCHAR(255) | NULL |
| serial_number | VARCHAR(100) | NULL |
| manufacturing_year | INTEGER | NULL |
| capacity_kg | INTEGER | NULL |
| capacity_persons | INTEGER | NULL |
| speed_ms | DECIMAL(5,2) | NULL |
| floors_served | INTEGER | NULL |
| stops | INTEGER | NULL |
| drive_type | VARCHAR(50) | NULL |
| additional_technical | JSONB | NULL |
| correction_fields | JSONB | NULL (for DATA_CORRECTION: field→old→new) |
| update_fields | JSONB | NULL (for DATA_UPDATE: field→old→new) |
| deregistration_reason | TEXT | NULL |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

#### `app_workflow_history`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| application_id | UUID | FK → app_applications.id, NOT NULL |
| from_status | app_status | NULL |
| to_status | app_status | NOT NULL |
| action | VARCHAR(50) | NOT NULL |
| actor_id | UUID | FK → auth_users.id, NOT NULL |
| comment | TEXT | NULL |
| metadata | JSONB | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_workflow_app`, `idx_workflow_actor`

---

### 3.4 Elevators

#### `elv_elevators`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| registry_number | VARCHAR(30) | UNIQUE, NOT NULL |
| application_id | UUID | FK → app_applications.id, NOT NULL |
| status | elv_status | DEFAULT 'ACTIVE' |
| owner_org_id | UUID | FK → org_organizations.id, NOT NULL |
| installer_org_id | UUID | FK → org_organizations.id, NOT NULL |
| certifier_org_id | UUID | FK → org_organizations.id, NOT NULL |
| maintenance_org_id | UUID | FK → org_organizations.id, NULL |
| building_address | TEXT | NOT NULL |
| building_municipality | VARCHAR(100) | NOT NULL |
| building_name | VARCHAR(255) | NULL |
| gps_latitude | DECIMAL(10,7) | NULL |
| gps_longitude | DECIMAL(10,7) | NULL |
| registration_date | DATE | NOT NULL |
| activation_date | DATE | NULL |
| deregistration_date | DATE | NULL |
| deregistration_reason | TEXT | NULL |
| migration_batch_id | UUID | FK → mig_batches.id, NULL |
| confirmed_at | TIMESTAMPTZ | NULL (for PENDING_CONFIRMATION) |
| confirmed_by | UUID | FK → auth_users.id, NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |
| deleted_at | TIMESTAMPTZ | NULL |

**Indexes:** `idx_elv_registry`, `idx_elv_status`, `idx_elv_municipality`, `idx_elv_owner`, `idx_elv_maintenance`, `idx_elv_active` (partial), `idx_elv_migration`

#### `elv_technical_data`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| elevator_id | UUID | FK → elv_elevators.id, UNIQUE, NOT NULL |
| elevator_type | elv_type | NOT NULL |
| manufacturer | VARCHAR(255) | NOT NULL |
| model | VARCHAR(255) | NULL |
| serial_number | VARCHAR(100) | NOT NULL |
| manufacturing_year | INTEGER | NULL |
| capacity_kg | INTEGER | NULL |
| capacity_persons | INTEGER | NULL |
| speed_ms | DECIMAL(5,2) | NULL |
| floors_served | INTEGER | NOT NULL |
| stops | INTEGER | NULL |
| drive_type | VARCHAR(50) | NULL |
| door_type | VARCHAR(50) | NULL |
| control_system | VARCHAR(100) | NULL |
| additional_data | JSONB | NULL |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

#### `elv_responsible_entities`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| elevator_id | UUID | FK → elv_elevators.id, NOT NULL |
| organization_id | UUID | FK → org_organizations.id, NOT NULL |
| role | org_type | NOT NULL (OWNER, INSTALLER, CERTIFIER, MAINTENANCE) |
| valid_from | DATE | NOT NULL |
| valid_to | DATE | NULL |
| application_id | UUID | FK → app_applications.id, NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_resp_elv`, `idx_resp_org`, `idx_resp_current` (partial: `WHERE valid_to IS NULL`)

#### `elv_status_history`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| elevator_id | UUID | FK → elv_elevators.id, NOT NULL |
| from_status | elv_status | NULL |
| to_status | elv_status | NOT NULL |
| reason | TEXT | NULL |
| application_id | UUID | FK → app_applications.id, NULL |
| actor_id | UUID | FK → auth_users.id, NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_status_hist_elv`

---

### 3.5 Certificates

#### `cert_certificates`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| certificate_number | VARCHAR(30) | UNIQUE, NOT NULL |
| elevator_id | UUID | FK → elv_elevators.id, NOT NULL |
| type | cert_type | NOT NULL |
| status | cert_status | DEFAULT 'ACTIVE' |
| issued_date | DATE | NOT NULL |
| expiry_date | DATE | NULL |
| issued_by_org_id | UUID | FK → org_organizations.id, NULL |
| issued_by_user_id | UUID | FK → auth_users.id, NULL |
| application_id | UUID | FK → app_applications.id, NULL |
| inspection_id | UUID | FK → insp_inspections.id, NULL |
| document_id | UUID | FK → doc_documents.id, NULL |
| superseded_by_id | UUID | FK → cert_certificates.id, NULL |
| revoked_at | TIMESTAMPTZ | NULL |
| revoked_reason | TEXT | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_cert_elv`, `idx_cert_type`, `idx_cert_status`, `idx_cert_expiry`, `idx_cert_number`

---

### 3.6 QR Codes

#### `qr_codes`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| elevator_id | UUID | FK → elv_elevators.id, NOT NULL |
| code | VARCHAR(12) | UNIQUE, NOT NULL |
| is_active | BOOLEAN | DEFAULT true |
| generated_at | TIMESTAMPTZ | DEFAULT now() |
| deactivated_at | TIMESTAMPTZ | NULL |
| scan_count | INTEGER | DEFAULT 0 |

**Indexes:** `idx_qr_code`, `idx_qr_elv`, `idx_qr_active` (partial: `WHERE is_active = true`)

#### `qr_scan_logs`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| qr_code_id | UUID | FK → qr_codes.id, NOT NULL |
| scanned_at | TIMESTAMPTZ | DEFAULT now() |
| ip_address | INET | NULL |
| user_agent | TEXT | NULL |

**Indexes:** `idx_scan_qr`, `idx_scan_date`

---

### 3.7 Documents

#### `doc_documents`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| filename | VARCHAR(255) | NOT NULL |
| original_filename | VARCHAR(255) | NOT NULL |
| mime_type | VARCHAR(100) | NOT NULL |
| file_size | BIGINT | NOT NULL |
| storage_path | VARCHAR(500) | NOT NULL |
| checksum_sha256 | VARCHAR(64) | NOT NULL |
| classification | doc_classification | NOT NULL |
| uploaded_by | UUID | FK → auth_users.id, NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| deleted_at | TIMESTAMPTZ | NULL |

**Indexes:** `idx_doc_classification`, `idx_doc_uploaded_by`

#### `doc_document_links`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| document_id | UUID | FK → doc_documents.id, NOT NULL |
| entity_type | VARCHAR(50) | NOT NULL (application, elevator, inspection, etc.) |
| entity_id | UUID | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_doclink_entity` (entity_type, entity_id), `idx_doclink_doc`

#### `doc_access_log`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| document_id | UUID | FK → doc_documents.id, NOT NULL |
| user_id | UUID | FK → auth_users.id, NOT NULL |
| action | VARCHAR(20) | NOT NULL (VIEW, DOWNLOAD) |
| ip_address | INET | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

---

### 3.8 Maintenance

#### `maint_contracts`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| elevator_id | UUID | FK → elv_elevators.id, NOT NULL |
| maintenance_org_id | UUID | FK → org_organizations.id, NOT NULL |
| contract_number | VARCHAR(50) | NULL |
| start_date | DATE | NOT NULL |
| end_date | DATE | NULL |
| application_id | UUID | FK → app_applications.id, NULL |
| document_id | UUID | FK → doc_documents.id, NULL |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_maint_contract_elv`, `idx_maint_contract_org`

#### `maint_records`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| elevator_id | UUID | FK → elv_elevators.id, NOT NULL |
| maintenance_org_id | UUID | FK → org_organizations.id, NOT NULL |
| type | maint_type | NOT NULL |
| performed_date | DATE | NOT NULL |
| technician_name | VARCHAR(100) | NULL |
| description | TEXT | NULL |
| findings | TEXT | NULL |
| next_due_date | DATE | NULL |
| document_id | UUID | FK → doc_documents.id, NULL |
| created_by | UUID | FK → auth_users.id, NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_maint_record_elv`, `idx_maint_record_date`, `idx_maint_record_org`

#### `maint_compliance_status`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| elevator_id | UUID | FK → elv_elevators.id, UNIQUE, NOT NULL |
| last_maintenance_date | DATE | NULL |
| next_due_date | DATE | NULL |
| is_compliant | BOOLEAN | DEFAULT true |
| days_overdue | INTEGER | DEFAULT 0 |
| last_calculated_at | TIMESTAMPTZ | DEFAULT now() |

---

### 3.9 Inspections

#### `insp_inspections`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| elevator_id | UUID | FK → elv_elevators.id, NOT NULL |
| inspector_id | UUID | FK → auth_users.id, NOT NULL |
| type | insp_type | NOT NULL |
| status | insp_result | DEFAULT 'PENDING' |
| scheduled_date | DATE | NOT NULL |
| conducted_date | DATE | NULL |
| result | insp_result | NULL |
| findings | TEXT | NULL |
| conditions | TEXT | NULL (for CONDITIONAL result) |
| next_inspection_date | DATE | NULL |
| report_document_id | UUID | FK → doc_documents.id, NULL |
| certificate_id | UUID | FK → cert_certificates.id, NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_insp_elv`, `idx_insp_inspector`, `idx_insp_scheduled`, `idx_insp_status`

---

### 3.10 Citizen Reports

#### `cit_reports`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| report_number | VARCHAR(20) | UNIQUE, NOT NULL |
| type | cit_report_type | NOT NULL |
| status | cit_report_status | DEFAULT 'SUBMITTED' |
| reporter_user_id | UUID | FK → auth_users.id, NULL (null = anonymous) |
| reporter_name | VARCHAR(100) | NULL |
| reporter_email | VARCHAR(255) | NULL |
| reporter_phone | VARCHAR(20) | NULL |
| elevator_id | UUID | FK → elv_elevators.id, NULL |
| location_address | TEXT | NULL |
| municipality | VARCHAR(100) | NULL |
| gps_latitude | DECIMAL(10,7) | NULL |
| gps_longitude | DECIMAL(10,7) | NULL |
| description | TEXT | NOT NULL |
| priority | VARCHAR(10) | DEFAULT 'NORMAL' (LOW, NORMAL, HIGH, URGENT) |
| assigned_inspector_id | UUID | FK → auth_users.id, NULL |
| resolved_at | TIMESTAMPTZ | NULL |
| resolution_notes | TEXT | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_cit_status`, `idx_cit_type`, `idx_cit_priority`, `idx_cit_inspector`, `idx_cit_elv`

#### `cit_report_actions`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| report_id | UUID | FK → cit_reports.id, NOT NULL |
| action | VARCHAR(50) | NOT NULL |
| actor_id | UUID | FK → auth_users.id, NOT NULL |
| comment | TEXT | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

---

### 3.11 Migration

#### `mig_batches`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| batch_number | VARCHAR(20) | UNIQUE, NOT NULL |
| filename | VARCHAR(255) | NOT NULL |
| status | mig_batch_status | DEFAULT 'UPLOADED' |
| total_rows | INTEGER | DEFAULT 0 |
| valid_rows | INTEGER | DEFAULT 0 |
| error_rows | INTEGER | DEFAULT 0 |
| duplicate_rows | INTEGER | DEFAULT 0 |
| imported_rows | INTEGER | DEFAULT 0 |
| mapping_config | JSONB | NULL |
| error_log | JSONB | NULL |
| started_at | TIMESTAMPTZ | NULL |
| completed_at | TIMESTAMPTZ | NULL |
| rolled_back_at | TIMESTAMPTZ | NULL |
| created_by | UUID | FK → auth_users.id, NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

#### `mig_staging_records`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| batch_id | UUID | FK → mig_batches.id, NOT NULL |
| row_number | INTEGER | NOT NULL |
| raw_data | JSONB | NOT NULL |
| mapped_data | JSONB | NULL |
| validation_status | VARCHAR(20) | DEFAULT 'PENDING' |
| validation_errors | JSONB | NULL |
| duplicate_of_id | UUID | NULL (references elv_elevators.id or another staging row) |
| duplicate_score | DECIMAL(5,2) | NULL |
| import_action | VARCHAR(20) | NULL (IMPORT, SKIP, MERGE) |
| elevator_id | UUID | FK → elv_elevators.id, NULL (after import) |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_staging_batch`, `idx_staging_validation`

---

### 3.12 System

#### `sys_notifications`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK → auth_users.id, NOT NULL |
| channel | notif_channel | NOT NULL |
| status | notif_status | DEFAULT 'PENDING' |
| title | VARCHAR(255) | NOT NULL |
| body | TEXT | NOT NULL |
| entity_type | VARCHAR(50) | NULL |
| entity_id | UUID | NULL |
| read_at | TIMESTAMPTZ | NULL |
| sent_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_notif_user`, `idx_notif_status`, `idx_notif_unread` (partial: `WHERE read_at IS NULL`)

#### `sys_config`
| Column | Type | Constraints |
|--------|------|-------------|
| key | VARCHAR(100) | PK |
| value | JSONB | NOT NULL |
| description | TEXT | NULL |
| updated_by | UUID | FK → auth_users.id |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

---

### 3.13 Audit

#### `audit_logs`
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| actor_id | UUID | FK → auth_users.id, NULL (null for system actions) |
| action | audit_action | NOT NULL |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | UUID | NOT NULL |
| before_state | JSONB | NULL |
| after_state | JSONB | NULL |
| metadata | JSONB | NULL |
| ip_address | INET | NULL |
| user_agent | TEXT | NULL |
| correlation_id | UUID | NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:** `idx_audit_entity` (entity_type, entity_id), `idx_audit_actor`, `idx_audit_action`, `idx_audit_created`, `idx_audit_correlation`

**Partitioning (Phase 2):** Range partition by `created_at` (monthly) for performance.

## 4. Key Relationships Summary

| Parent | Child | Relationship | ON DELETE |
|--------|-------|--------------|-----------|
| auth_users | org_memberships | 1:N | RESTRICT |
| org_organizations | org_memberships | 1:N | RESTRICT |
| org_organizations | org_licenses | 1:N | RESTRICT |
| app_applications | app_application_data | 1:1 | CASCADE |
| app_applications | app_workflow_history | 1:N | RESTRICT |
| app_applications | elv_elevators | 1:1 | RESTRICT |
| elv_elevators | elv_technical_data | 1:1 | CASCADE |
| elv_elevators | elv_responsible_entities | 1:N | RESTRICT |
| elv_elevators | elv_status_history | 1:N | RESTRICT |
| elv_elevators | cert_certificates | 1:N | RESTRICT |
| elv_elevators | qr_codes | 1:N | RESTRICT |
| elv_elevators | maint_records | 1:N | RESTRICT |
| elv_elevators | insp_inspections | 1:N | RESTRICT |
| elv_elevators | cit_reports | 1:N | SET NULL |
| doc_documents | doc_document_links | 1:N | RESTRICT |
| mig_batches | mig_staging_records | 1:N | CASCADE |
| mig_batches | elv_elevators | 1:N | SET NULL |

## 5. Audit Strategy

### 5.1 Automatic Audit Capture

All domain services call `AuditService.log()` within the same database transaction:

```
mutation request
  → begin transaction
    → perform mutation
    → AuditService.log(action, entity, before, after, actor, correlationId)
  → commit transaction
```

### 5.2 What Gets Audited

| Category | Examples |
|----------|----------|
| Entity lifecycle | Create, update, soft-delete of all primary entities |
| Workflow transitions | Every application status change |
| Status changes | Elevator status transitions |
| Document events | Upload, download, delete |
| Authentication | Login, logout, failed login |
| Authorization | Permission denied attempts (security monitoring) |
| Migration | Import start, completion, rollback |
| Configuration | System config changes |

### 5.3 Audit Immutability

- No UPDATE or DELETE on `audit_logs`
- Database role for application: INSERT only on `audit_logs`
- Separate read-only role for audit queries

## 6. Registry Number Generation

```
Format: ELV-{YEAR}-{MUN_CODE}-{SEQUENCE:6}
Example: ELV-2026-TIA-000042

Generated atomically via:
  SELECT nextval('elv_registry_seq_{year}_{mun_code}')
  
Stored in sys_config or dedicated sequence table per municipality per year.
```

## 7. Application Number Generation

```
Format: APP-{YEAR}-{TYPE_CODE}-{SEQUENCE:6}
Example: APP-2026-REG-000015

TYPE_CODE: REG (registration), DER (deregistration), COR (correction), UPD (update)
```

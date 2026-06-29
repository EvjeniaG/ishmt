# User Access Matrix

## 1. Role Definitions

| Code | Role | Description | Organization Required |
|------|------|-------------|----------------------|
| `PUBLIC` | Public Citizen | Unauthenticated or registered citizen | No |
| `OWNER` | Owner / Building Administrator | Building owner or authorized administrator | Yes (Owner entity) |
| `INSTALLER` | Installation Company | Licensed elevator installation company | Yes (Installer org) |
| `CERTIFIER` | Certification Company / OMI | Licensed certification/inspection body | Yes (OMI org) |
| `MAINTENANCE` | Maintenance Company | Licensed maintenance service provider | Yes (Maintenance org) |
| `INSPECTOR` | ISHMT Inspector | Market surveillance inspector | Yes (ISHMT) |
| `ADMIN` | ISHMT Administrator | System administrator | Yes (ISHMT) |
| `DIRECTORATE` | Directorate Staff | Internal Market Policies directorate | Yes (Directorate) |

## 2. Permission Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Full access (CRUD where applicable) |
| 👁 | Read-only |
| 🔒 | Scoped to own organization/data only |
| ⚡ | Action-specific (limited operations) |
| ❌ | No access |
| 🌐 | Public (no authentication) |

## 3. Module Access Matrix

### 3.1 Core Modules

| Module / Action | PUBLIC | OWNER | INSTALLER | CERTIFIER | MAINTENANCE | INSPECTOR | ADMIN | DIRECTORATE |
|-----------------|--------|-------|-----------|-----------|-------------|-----------|-------|-------------|
| **Authentication** | | | | | | | | |
| Register account | 🌐 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Login | 🌐 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage own profile | ❌ | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |
| **Users** | | | | | | | | |
| View own org members | ❌ | 🔒 | 🔒 | 🔒 | 🔒 | 👁 | ✅ | 👁 |
| Manage org members | ❌ | ⚡ | ⚡ | ⚡ | ⚡ | ❌ | ✅ | ❌ |
| Manage all users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Organizations** | | | | | | | | |
| View own organization | ❌ | 🔒 | 🔒 | 🔒 | 🔒 | 👁 | ✅ | 👁 |
| Edit own organization | ❌ | 🔒 | ❌ | ❌ | 🔒 | ❌ | ✅ | ❌ |
| View installer companies | ❌ | 👁 | 👁 | 👁 | 👁 | 👁 | ✅ | ✅ |
| View OMI companies | ❌ | 👁 | 👁 | 👁 | 👁 | 👁 | ✅ | ✅ |
| Manage installer companies | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 | ✅ |
| Manage OMI companies | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 | ✅ |
| QKB validate maintenance co. | ❌ | ❌ | ❌ | ❌ | ⚡ | ❌ | ✅ | ❌ |

### 3.2 Application & Elevator Modules

| Module / Action | PUBLIC | OWNER | INSTALLER | CERTIFIER | MAINTENANCE | INSPECTOR | ADMIN | DIRECTORATE |
|-----------------|--------|-------|-----------|-----------|-------------|-----------|-------|-------------|
| **Applications** | | | | | | | | |
| Create new registration | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ⚡ | ❌ |
| Create deregistration | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ | ⚡ | ❌ |
| Create data correction | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ | ⚡ | ❌ |
| Create data update | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ | ⚡ | ❌ |
| View own applications | ❌ | 🔒 | 🔒 | 🔒 | ❌ | 👁 | ✅ | ❌ |
| Fill technical data | ❌ | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Upload certification | ❌ | ❌ | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ |
| Submit to ISHMT | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Review application | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Approve/reject application | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Return for correction | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Elevators** | | | | | | | | |
| View own elevators | ❌ | 🔒 | 🔒 | 🔒 | 🔒 | 👁 | ✅ | ❌ |
| View elevator digital file | ❌ | 🔒 | 🔒 | 🔒 | 🔒 | ✅ | ✅ | ❌ |
| Search all elevators | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Change elevator status | ❌ | ❌ | ❌ | ❌ | ❌ | ⚡ | ✅ | ❌ |
| Confirm migrated elevator | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |

### 3.3 Compliance Modules

| Module / Action | PUBLIC | OWNER | INSTALLER | CERTIFIER | MAINTENANCE | INSPECTOR | ADMIN | DIRECTORATE |
|-----------------|--------|-------|-----------|-----------|-------------|-----------|-------|-------------|
| **Certificates** | | | | | | | | |
| View certificates (own) | ❌ | 🔒 | 🔒 | 🔒 | 👁 | ✅ | ✅ | ❌ |
| Upload certificate | ❌ | ❌ | ❌ | 🔒 | ❌ | ❌ | ❌ | ❌ |
| Generate registration cert. | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚡ | ❌ |
| Revoke certificate | ❌ | ❌ | ❌ | ❌ | ❌ | ⚡ | ✅ | ❌ |
| **QR Codes** | | | | | | | | |
| View public QR profile | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 | 🌐 |
| Download QR image | ❌ | 🔒 | ❌ | ❌ | ❌ | 👁 | ✅ | ❌ |
| **Maintenance** | | | | | | | | |
| Log maintenance record | ❌ | ❌ | ❌ | ❌ | 🔒 | ❌ | ❌ | ❌ |
| View maintenance history | ❌ | 🔒 | ❌ | ❌ | 🔒 | ✅ | ✅ | ❌ |
| View compliance status | ❌ | 🔒 | ❌ | ❌ | 🔒 | ✅ | ✅ | ❌ |
| **Inspections** | | | | | | | | |
| Schedule inspection | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Conduct inspection | ❌ | ❌ | ❌ | ❌ | ❌ | 🔒 | ❌ | ❌ |
| Record inspection result | ❌ | ❌ | ❌ | ❌ | ❌ | 🔒 | ❌ | ❌ |
| View inspection history | ❌ | 🔒 | ❌ | ❌ | 👁 | ✅ | ✅ | ❌ |

### 3.4 Support Modules

| Module / Action | PUBLIC | OWNER | INSTALLER | CERTIFIER | MAINTENANCE | INSPECTOR | ADMIN | DIRECTORATE |
|-----------------|--------|-------|-----------|-----------|-------------|-----------|-------|-------------|
| **Documents** | | | | | | | | |
| Upload documents | ❌ | 🔒 | 🔒 | 🔒 | 🔒 | ✅ | ✅ | ❌ |
| Download documents | ❌ | 🔒 | 🔒 | 🔒 | 🔒 | ✅ | ✅ | ❌ |
| **Notifications** | | | | | | | | |
| View own notifications | ❌ | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |
| Manage notification prefs | ❌ | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |
| **Citizen Reporting** | | | | | | | | |
| Submit report (anonymous) | 🌐 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit report (authenticated) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Triage reports | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| Resolve reports | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Audit Logs** | | | | | | | | |
| View entity audit trail | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 | ✅ | ❌ |
| System-wide audit search | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Reporting** | | | | | | | | |
| View own dashboard | ❌ | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 |
| Operational reports | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | 👁 |
| Regulatory reports | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | 👁 |
| Export reports | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | 👁 |
| **Excel Import** | | | | | | | | |
| Upload import file | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Review staging data | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Execute import | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Rollback import | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **System Config** | | | | | | | | |
| View configuration | ❌ | ❌ | ❌ | ❌ | ❌ | 👁 | ✅ | ❌ |
| Edit configuration | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

## 4. Organization-Based Data Scoping Rules

| Role | Data Scope |
|------|------------|
| OWNER | Elevators and applications where `owner_org_id = user.org_id` |
| INSTALLER | Applications where `installer_org_id = user.org_id` |
| CERTIFIER | Applications where `certifier_org_id = user.org_id` |
| MAINTENANCE | Elevators where `maintenance_org_id = user.org_id` |
| INSPECTOR | All data within assigned municipality/region |
| ADMIN | All data (unrestricted) |
| DIRECTORATE | Organization records for installer and OMI types only |
| PUBLIC | Public QR profiles and report submission only |

## 5. Document Access Classification

| Classification | OWNER | INSTALLER | CERTIFIER | MAINTENANCE | INSPECTOR | ADMIN |
|----------------|-------|-----------|-----------|-------------|-----------|-------|
| `APPLICATION` | 🔒 | 🔒 | 🔒 | ❌ | ✅ | ✅ |
| `TECHNICAL` | 🔒 | 🔒 | 👁 | ❌ | ✅ | ✅ |
| `CERTIFICATE` | 🔒 | 👁 | 🔒 | 👁 | ✅ | ✅ |
| `INSPECTION_REPORT` | 👁 | ❌ | ❌ | ❌ | ✅ | ✅ |
| `MAINTENANCE_LOG` | 🔒 | ❌ | ❌ | 🔒 | ✅ | ✅ |
| `INTERNAL_ISHMT` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `CITIZEN_REPORT` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

## 6. Workflow Action Permissions

| Workflow Transition | Allowed Roles |
|---------------------|---------------|
| Create application (DRAFT) | OWNER, ADMIN |
| Assign installer | OWNER |
| Complete technical data | INSTALLER |
| Assign certifier | INSTALLER |
| Upload certification | CERTIFIER |
| Submit to ISHMT | OWNER |
| Start review | INSPECTOR, ADMIN |
| Approve | INSPECTOR, ADMIN |
| Reject | INSPECTOR, ADMIN |
| Return for correction | INSPECTOR, ADMIN |
| Create elevator (side-effect) | System (on approval) |
| Activate elevator | System (on certificate + QR generation) |
| Suspend elevator | INSPECTOR, ADMIN |
| Deregister elevator | INSPECTOR, ADMIN (via deregistration application) |

## 7. Multi-Organization Users

A user may belong to multiple organizations (e.g., a person who is both an owner and a maintenance company representative). The system handles this via:

1. **Organization context switcher** in the UI
2. Session stores `active_org_id`
3. All data queries scoped to `active_org_id`
4. Permissions evaluated based on role within active organization

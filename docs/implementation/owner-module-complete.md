# Owner / Administrator / Constructor Module

## Scope delivered

Production-oriented Owner portal module aligned with Phases 1–6 architecture.

### Dashboard (`/portal/dashboard`)
- Scoped metrics: active elevators, in-progress applications, returned items, expiring deadlines, missing maintenance, notifications
- Pending actions queue, deadline alerts, recent elevators table
- Quick actions for all application types

### Organization profile (`/portal/settings/organization`)
- Extended owner fields: NIPT/NID, legal form, representative, building role
- Municipality required (select only)
- **No QKB validation for owners** - QKB applies only to maintenance company assignment

### Applications
- List with type, status, next action (`/portal/applications`)
- Type picker (`/portal/applications/new`)
- **6-step registration wizard** with statuses: `BASIC_DATA_COMPLETED` → installer delegation → `INSTALLER_COMPLETED` → certifier delegation → certifier review → submit
- Correction, update, deregistration, modernization draft creation
- Application delegations (`ApplicationDelegation`) with invite/accept flow
- Submission validation (basic data, installer, certifier, OMI, serial duplicate check)

### Elevators
- List (`/portal/elevators`) with compliance indicator
- Digital file (`/portal/elevators/[id]`) - 9 tabs
- QR page (existing, linked)
- Maintenance assignment (`/portal/elevators/[id]/maintenance/change`) - **QKB-validated companies only**

### Notifications (`/portal/notifications`)
- In-app notifications on workflow events (assign, complete, submit, return)

### Permissions (49 total)
Owner receives scoped permissions per spec - no approve/review/system audit.

### Schema additions
- `BuildingType`, `UsagePurpose`, `OwnerBuildingRole`, `DeregistrationReason`, `ModernizationType`, `DataUpdateType`
- `ApplicationStatus`: `BASIC_DATA_COMPLETED`, `INSTALLER_COMPLETED`
- `ApplicationDelegation`, extended `ApplicationData` and `Organization` fields
- `Application.returnedAt`, `returnedById`

### Services
- `OwnerDashboardService`, `NotificationService`, `MaintenanceAssignmentService`
- Extended `ApplicationService`, `ElevatorService`, `OrganizationService`

### Tests
- 33 tests passing (workflow updated for new registration steps)

## Business rules enforced
1. No elevator created until ISHMT approval (registration wizard only creates `Application`)
2. Owner cannot mutate elevator records directly
3. Owner cannot assign non-QKB-validated maintenance companies
4. Document downloads use existing `DocumentAccessLog` + audit path
5. QR placement photo ACL unchanged (owner + ISHMT only)

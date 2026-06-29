/**
 * Static permission codes - seeded at deploy, not user-editable.
 * @see docs/architecture/05-user-access-matrix.md
 */
export const PERMISSIONS = {
  PUBLIC_QR_VIEW: "public.qr_view",
  PUBLIC_REPORT_CREATE: "public.report_create",

  REPORTS_VIEW: "reports.view",
  REPORTS_MANAGE: "reports.manage",
  REPORTS_EXPORT: "reports.export",

  AUTH_PROFILE_VIEW: "auth.profile.view",
  AUTH_PROFILE_EDIT: "auth.profile.edit",

  USERS_MEMBERS_VIEW: "users.members.view",
  USERS_MEMBERS_MANAGE: "users.members.manage",
  USERS_MANAGE_ALL: "users.manage_all",

  ORG_VIEW_OWN: "organizations.org.view_own",
  ORG_EDIT_OWN: "organizations.org.edit_own",
  ORG_VIEW_COMPANIES: "organizations.org.view_companies",
  ORG_MANAGE_INSTALLER: "organizations.org.manage_installer",
  ORG_MANAGE_CERTIFIER: "organizations.org.manage_certifier",

  LICENSES_VIEW: "licenses.view",
  LICENSES_MANAGE: "licenses.manage",

  QKB_SUBMIT: "qkb.submit",
  QKB_VALIDATE_MANUAL: "qkb.validate_manual",

  DASHBOARD_VIEW: "dashboard.view",

  AUDIT_VIEW_ENTITY: "audit.view_entity",
  AUDIT_VIEW_SYSTEM: "audit.view_system",

  APPLICATIONS_CREATE: "applications.create",
  APPLICATIONS_VIEW_OWN: "applications.view_own",
  APPLICATIONS_VIEW_ALL: "applications.view_all",
  APPLICATIONS_EDIT_DRAFT: "applications.edit_draft",
  APPLICATIONS_SUBMIT: "applications.submit",
  APPLICATIONS_CANCEL_DRAFT: "applications.cancel_draft",
  APPLICATIONS_ASSIGN_INSTALLER: "applications.assign_installer",
  APPLICATIONS_FILL_TECHNICAL: "applications.fill_technical",
  APPLICATIONS_ASSIGN_CERTIFIER: "applications.assign_certifier",
  APPLICATIONS_UPLOAD_CERTIFICATION: "applications.upload_certification",
  APPLICATIONS_REVIEW: "applications.review",
  APPLICATIONS_APPROVE: "applications.approve",

  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_VIEW_OWN: "documents.view_own",
  DOCUMENTS_UPLOAD: "documents.upload",
  DOCUMENTS_UPLOAD_OWN: "documents.upload_own",
  DOCUMENTS_DOWNLOAD: "documents.download",
  DOCUMENTS_DOWNLOAD_OWN: "documents.download_own",

  ELEVATORS_VIEW_OWN: "elevators.view_own",
  ELEVATORS_VIEW_DIGITAL_FILE: "elevators.view_digital_file",

  CERTIFICATES_VIEW_OWN: "certificates.view_own",
  CERTIFICATES_DOWNLOAD_OWN: "certificates.download_own",

  QR_VIEW_OWN: "qr.view_own",
  QR_DOWNLOAD_OWN: "qr.download_own",
  QR_UPLOAD_PLACEMENT_PHOTO: "qr.upload_placement_photo",

  MAINTENANCE_REQUEST_ASSIGNMENT: "maintenance.request_assignment",
  MAINTENANCE_VIEW_ASSIGNED: "maintenance.view_assigned",
  MAINTENANCE_ACCEPT_CONTRACT: "maintenance.accept_contract",
  MAINTENANCE_LOG_INTERVENTION: "maintenance.log_intervention",
  MAINTENANCE_UPLOAD_REPORT: "maintenance.upload_report",

  CERTIFIER_VIEW_INSPECTION_ASSIGNMENTS: "certifier.view_inspection_assignments",
  CERTIFIER_ACCEPT_INSPECTION_CONTRACT: "certifier.accept_inspection_contract",
  CERTIFIER_LOG_PERIODIC_INSPECTION: "certifier.log_periodic_inspection",

  INSPECTIONS_FIELD_ASSIGN: "inspections.field.assign",
  INSPECTIONS_FIELD_VIEW_ALL: "inspections.field.view_all",
  INSPECTIONS_FIELD_VIEW_OWN: "inspections.field.view_own",
  INSPECTIONS_FIELD_CONDUCT: "inspections.field.conduct",
  INSPECTIONS_FIELD_CANCEL: "inspections.field.cancel",

  NOTIFICATIONS_VIEW_OWN: "notifications.view_own",

  MIGRATION_UPLOAD: "migration.upload",
  MIGRATION_REVIEW: "migration.review",
  MIGRATION_IMPORT: "migration.import",
  MIGRATION_ROLLBACK: "migration.rollback",
  MIGRATION_CONFIRM: "migration.confirm",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(PERMISSIONS);

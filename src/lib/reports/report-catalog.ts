import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import type { AuthContext } from "@/lib/permissions/guards";

export type ReportId =
  | "elevators"
  | "applications"
  | "citizen_reports"
  | "maintenance_records"
  | "inspections"
  | "field_inspections"
  | "compliance_summary"
  | "companies";

export type ReportFilterField = {
  key: string;
  label: string;
  type: "select" | "date";
  options?: { value: string; label: string }[];
};

export type ReportDefinition = {
  id: ReportId;
  label: string;
  description: string;
  filters: ReportFilterField[];
};

const ELEVATOR_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Aktiv" },
  { value: "PENDING_CONFIRMATION", label: "Në pritje konfirmimi" },
  { value: "SUSPENDED", label: "Pezulluar" },
  { value: "OUT_OF_SERVICE", label: "Jashtë shërbimit" },
  { value: "DEREGISTERED", label: "I çregjistruar" },
];

const COMPLIANCE_OPTIONS = [
  { value: "GREEN", label: "Konform" },
  { value: "YELLOW", label: "Afat në skadim" },
  { value: "RED", label: "Jo konform" },
];

const APPLICATION_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "I parashtruar" },
  { value: "UNDER_REVIEW", label: "Në shqyrtim" },
  { value: "PENDING_CHIEF_INSPECTOR", label: "Në pritje miratimi" },
  { value: "APPROVED", label: "I miratuar" },
  { value: "REJECTED", label: "I refuzuar" },
  { value: "RETURNED", label: "I kthyer" },
  { value: "CLOSED", label: "I mbyllur" },
];

const CITIZEN_REPORT_STATUS_OPTIONS = [
  { value: "SUBMITTED", label: "I dërguar" },
  { value: "TRIAGED", label: "Në shqyrtim" },
  { value: "ASSIGNED", label: "Caktuar" },
  { value: "INVESTIGATING", label: "Në hetim" },
  { value: "RESOLVED", label: "Zgjidhur" },
  { value: "DISMISSED", label: "Refuzuar" },
];

const REPORT_DEFINITIONS: Record<ReportId, Omit<ReportDefinition, "id">> = {
  elevators: {
    label: "Ashensorët",
    description: "Lista e ashensorëve sipas filtrave të zgjedhur",
    filters: [
      { key: "status", label: "Statusi", type: "select", options: ELEVATOR_STATUS_OPTIONS },
      { key: "compliance", label: "Përputhshmëria", type: "select", options: COMPLIANCE_OPTIONS },
      { key: "municipalityId", label: "Bashkia", type: "select", options: [] },
    ],
  },
  applications: {
    label: "Aplikimet",
    description: "Aplikimet e regjistrimit dhe lifecycle sipas filtrave",
    filters: [
      { key: "status", label: "Statusi", type: "select", options: APPLICATION_STATUS_OPTIONS },
      { key: "dateFrom", label: "Nga data", type: "date" },
      { key: "dateTo", label: "Deri më", type: "date" },
    ],
  },
  citizen_reports: {
    label: "Raportimet e qytetarëve",
    description: "Raportime publike të parashtruara nga qytetarët",
    filters: [
      { key: "status", label: "Statusi", type: "select", options: CITIZEN_REPORT_STATUS_OPTIONS },
    ],
  },
  maintenance_records: {
    label: "Ndërhyrjet e mirëmbajtjes",
    description: "Regjistri i ndërhyrjeve dhe raporteve periodike",
    filters: [
      { key: "dateFrom", label: "Nga data", type: "date" },
      { key: "dateTo", label: "Deri më", type: "date" },
    ],
  },
  inspections: {
    label: "Inspektimet periodike",
    description: "Inspektime të kryera nga OMI / certifikuesi",
    filters: [
      { key: "dateFrom", label: "Nga data", type: "date" },
      { key: "dateTo", label: "Deri më", type: "date" },
    ],
  },
  field_inspections: {
    label: "Inspektimet në terren",
    description: "Detyrat e verifikimit fizik në objekt",
    filters: [
      {
        key: "status",
        label: "Statusi",
        type: "select",
        options: [
          { value: "SCHEDULED", label: "E planifikuar" },
          { value: "IN_PROGRESS", label: "Në terren" },
          { value: "COMPLETED", label: "Përfunduar" },
          { value: "CANCELLED", label: "Anuluar" },
        ],
      },
    ],
  },
  compliance_summary: {
    label: "Përputhshmëria sipas bashkisë",
    description: "Përmbledhje e treguesve të përputhshmërisë në nivel lokal",
    filters: [],
  },
  companies: {
    label: "Kompanitë e licencuara",
    description: "Regjistri i kompanive instaluese, certifikuese dhe mirëmbajtëse",
    filters: [
      {
        key: "orgType",
        label: "Lloji",
        type: "select",
        options: [
          { value: "INSTALLER", label: "Instaluese" },
          { value: "CERTIFIER", label: "Certifikuese / OMI" },
          { value: "MAINTENANCE", label: "Mirëmbajtje" },
        ],
      },
    ],
  },
};

function roleCanExportReport(ctx: AuthContext, reportId: ReportId): boolean {
  if (!roleHasPermission(ctx.roleCode, PERMISSIONS.REPORTS_EXPORT)) return false;

  switch (reportId) {
    case "elevators":
      return (
        roleHasPermission(ctx.roleCode, PERMISSIONS.ELEVATORS_VIEW_OWN) ||
        roleHasPermission(ctx.roleCode, PERMISSIONS.ELEVATORS_VIEW_DIGITAL_FILE) ||
        roleHasPermission(ctx.roleCode, PERMISSIONS.APPLICATIONS_VIEW_ALL)
      );
    case "applications":
      return (
        roleHasPermission(ctx.roleCode, PERMISSIONS.APPLICATIONS_VIEW_OWN) ||
        roleHasPermission(ctx.roleCode, PERMISSIONS.APPLICATIONS_VIEW_ALL)
      );
    case "citizen_reports":
      return roleHasPermission(ctx.roleCode, PERMISSIONS.REPORTS_VIEW);
    case "maintenance_records":
      return (
        roleHasPermission(ctx.roleCode, PERMISSIONS.MAINTENANCE_VIEW_ASSIGNED) ||
        roleHasPermission(ctx.roleCode, PERMISSIONS.MAINTENANCE_LOG_INTERVENTION) ||
        roleHasPermission(ctx.roleCode, PERMISSIONS.APPLICATIONS_VIEW_ALL)
      );
    case "inspections":
      return (
        roleHasPermission(ctx.roleCode, PERMISSIONS.CERTIFIER_LOG_PERIODIC_INSPECTION) ||
        roleHasPermission(ctx.roleCode, PERMISSIONS.APPLICATIONS_VIEW_ALL)
      );
    case "field_inspections":
      return (
        roleHasPermission(ctx.roleCode, PERMISSIONS.INSPECTIONS_FIELD_VIEW_OWN) ||
        roleHasPermission(ctx.roleCode, PERMISSIONS.INSPECTIONS_FIELD_VIEW_ALL)
      );
    case "compliance_summary":
      return roleHasPermission(ctx.roleCode, PERMISSIONS.APPLICATIONS_VIEW_ALL);
    case "companies":
      return roleHasPermission(ctx.roleCode, PERMISSIONS.ORG_VIEW_COMPANIES);
    default:
      return false;
  }
}

export function getAvailableReports(ctx: AuthContext): ReportDefinition[] {
  return (Object.keys(REPORT_DEFINITIONS) as ReportId[])
    .filter((id) => roleCanExportReport(ctx, id))
    .map((id) => ({ id, ...REPORT_DEFINITIONS[id] }));
}

export function isReportAllowed(ctx: AuthContext, reportId: string): reportId is ReportId {
  return getAvailableReports(ctx).some((r) => r.id === reportId);
}

export function getReportDefinition(reportId: ReportId): ReportDefinition {
  return { id: reportId, ...REPORT_DEFINITIONS[reportId] };
}

/** Roles that should see the reports page link in navigation. */
export function canAccessReportsPage(roleCode: RoleCode): boolean {
  return roleCode !== ROLE_CODES.PUBLIC && roleCode !== ROLE_CODES.INSPECTOR;
}

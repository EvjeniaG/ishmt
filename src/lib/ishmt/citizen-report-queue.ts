import { CitizenReportStatus } from "@prisma/client";

/** Raportime që presin shqyrtim ose caktim nga ISHMT. */
export const CITIZEN_REPORT_TRIAGE_STATUSES: CitizenReportStatus[] = [
  CitizenReportStatus.SUBMITTED,
  CitizenReportStatus.TRIAGED,
];

export const CITIZEN_REPORT_ACTIVE_STATUSES: CitizenReportStatus[] = [
  CitizenReportStatus.SUBMITTED,
  CitizenReportStatus.TRIAGED,
  CitizenReportStatus.ASSIGNED,
  CitizenReportStatus.INVESTIGATING,
];

/** Raportime të mbyllura — regjistri i zgjidhura. */
export const CITIZEN_REPORT_CLOSED_STATUSES: CitizenReportStatus[] = [
  CitizenReportStatus.RESOLVED,
  CitizenReportStatus.DISMISSED,
];

export function citizenReportHasActiveAssignment(
  status: CitizenReportStatus,
  assignedInspectorId: string | null | undefined,
): boolean {
  return (
    (status === CitizenReportStatus.ASSIGNED ||
      status === CitizenReportStatus.INVESTIGATING) &&
    Boolean(assignedInspectorId)
  );
}

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

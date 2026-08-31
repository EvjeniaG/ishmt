import { CitizenReportStatus, CitizenReportType, ReportPriority } from "@prisma/client";

export const CITIZEN_REPORT_TYPE_LABELS: Record<CitizenReportType, string> = {
  SAFETY_ISSUE: "Problem sigurie",
  NO_QR: "Ashensor pa QR",
  COMPLAINT: "Ankesë / i paregjistruar",
};

export const CITIZEN_REPORT_STATUS_LABELS: Record<CitizenReportStatus, string> = {
  SUBMITTED: "I dërguar",
  TRIAGED: "Në shqyrtim",
  ASSIGNED: "Caktuar",
  INVESTIGATING: "Në hetim",
  RESOLVED: "Zgjidhur",
  DISMISSED: "Refuzuar",
};

/** Përmbledhje publike për qytetarin (pa detaje operative). */
export const PUBLIC_CITIZEN_REPORT_STATUS_LABELS: Record<CitizenReportStatus, string> = {
  SUBMITTED: "I pranuar — pret shqyrtim",
  TRIAGED: "U lexua — në shqyrtim",
  ASSIGNED: "U mor në ngarkim",
  INVESTIGATING: "Në hetim",
  RESOLVED: "Zgjidhur",
  DISMISSED: "Mbyllur",
};

export const REPORT_PRIORITY_LABELS: Record<ReportPriority, string> = {
  LOW: "E ulët",
  NORMAL: "Normale",
  HIGH: "E lartë",
  URGENT: "Urgjente",
};

export const REPORT_PRIORITY_CLASS: Record<ReportPriority, string> = {
  LOW: "bg-muted text-muted-foreground",
  NORMAL: "bg-gov-secondary/10 text-gov-secondary",
  HIGH: "bg-gov-warning/15 text-amber-900",
  URGENT: "bg-gov-danger/15 text-gov-danger",
};

const CITIZEN_REPORT_ACTION_LABELS: Record<string, string> = {
  ASSIGNED: "Inspektor i caktuar",
};

export function describeCitizenReportAction(action: string, comment?: string | null): {
  label: string;
  detail: string | null;
} {
  if (action === "ASSIGNED") {
    return {
      label: CITIZEN_REPORT_ACTION_LABELS.ASSIGNED,
      detail: comment?.trim() || null,
    };
  }

  const statusLabel =
    action in CITIZEN_REPORT_STATUS_LABELS
      ? CITIZEN_REPORT_STATUS_LABELS[action as CitizenReportStatus]
      : CITIZEN_REPORT_ACTION_LABELS[action] ?? action;

  return {
    label: statusLabel,
    detail: comment?.trim() || null,
  };
}

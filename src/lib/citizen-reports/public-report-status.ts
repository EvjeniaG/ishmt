import { CitizenReportStatus } from "@prisma/client";
import {
  CITIZEN_REPORT_TYPE_LABELS,
  PUBLIC_CITIZEN_REPORT_STATUS_LABELS,
} from "@/lib/registration/report-labels";

const REPORT_NUMBER_PATTERN = /^RPT-\d{4}-\d{6}$/i;

export function normalizeCitizenReportNumber(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidCitizenReportNumber(value: string): boolean {
  return REPORT_NUMBER_PATTERN.test(normalizeCitizenReportNumber(value));
}

export type PublicCitizenReportTimelineStep = {
  key: "submitted" | "read" | "resolved";
  label: string;
  at: Date | null;
  done: boolean;
};

export type PublicCitizenReportStatus = {
  reportNumber: string;
  typeLabel: string;
  statusLabel: string;
  submittedAt: Date;
  readAt: Date | null;
  resolvedAt: Date | null;
  isClosed: boolean;
  timeline: PublicCitizenReportTimelineStep[];
};

export type SerializablePublicCitizenReportStatus = {
  reportNumber: string;
  typeLabel: string;
  statusLabel: string;
  submittedAt: string;
  readAt: string | null;
  resolvedAt: string | null;
  isClosed: boolean;
  timeline: Array<{
    key: PublicCitizenReportTimelineStep["key"];
    label: string;
    at: string | null;
    done: boolean;
  }>;
};

export function serializePublicCitizenReportStatus(
  status: PublicCitizenReportStatus,
): SerializablePublicCitizenReportStatus {
  return {
    reportNumber: status.reportNumber,
    typeLabel: status.typeLabel,
    statusLabel: status.statusLabel,
    submittedAt: status.submittedAt.toISOString(),
    readAt: status.readAt?.toISOString() ?? null,
    resolvedAt: status.resolvedAt?.toISOString() ?? null,
    isClosed: status.isClosed,
    timeline: status.timeline.map((step) => ({
      ...step,
      at: step.at?.toISOString() ?? null,
    })),
  };
}

type ReportForPublicStatus = {
  reportNumber: string;
  type: keyof typeof CITIZEN_REPORT_TYPE_LABELS;
  status: CitizenReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  actions: Array<{ action: string; createdAt: Date }>;
};

function resolveReadAt(report: ReportForPublicStatus): Date | null {
  if (report.status === CitizenReportStatus.SUBMITTED) return null;

  const firstReviewAction = [...report.actions]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .find((action) => action.action !== CitizenReportStatus.SUBMITTED);

  return firstReviewAction?.createdAt ?? report.createdAt;
}

export function buildPublicCitizenReportStatus(
  report: ReportForPublicStatus,
): PublicCitizenReportStatus {
  const readAt = resolveReadAt(report);
  const isClosed =
    report.status === CitizenReportStatus.RESOLVED ||
    report.status === CitizenReportStatus.DISMISSED;

  const resolvedLabel =
    report.status === CitizenReportStatus.DISMISSED ? "Mbyllur" : "Zgjidhur";

  return {
    reportNumber: report.reportNumber,
    typeLabel: CITIZEN_REPORT_TYPE_LABELS[report.type],
    statusLabel: PUBLIC_CITIZEN_REPORT_STATUS_LABELS[report.status],
    submittedAt: report.createdAt,
    readAt,
    resolvedAt: isClosed ? report.resolvedAt : null,
    isClosed,
    timeline: [
      {
        key: "submitted",
        label: "I dërguar te IQMT",
        at: report.createdAt,
        done: true,
      },
      {
        key: "read",
        label: "U lexua nga IQMT",
        at: readAt,
        done: readAt != null,
      },
      {
        key: "resolved",
        label: resolvedLabel,
        at: isClosed ? report.resolvedAt : null,
        done: isClosed,
      },
    ],
  };
}

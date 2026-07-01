import Link from "next/link";
import { OfficialTableFooter } from "@/components/shared/institutional";
import { PortalEmptyState } from "@/components/shared/portal-table";
import {
  CITIZEN_REPORT_STATUS_LABELS,
  CITIZEN_REPORT_TYPE_LABELS,
  REPORT_PRIORITY_CLASS,
  REPORT_PRIORITY_LABELS,
} from "@/lib/registration/report-labels";
import type { CitizenReportStatus, CitizenReportType, ReportPriority } from "@prisma/client";

export type CitizenReportListItem = {
  id: string;
  reportNumber: string;
  type: CitizenReportType;
  status: CitizenReportStatus;
  description: string;
  priority: ReportPriority;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  elevator: { id: string; registryNumber: string } | null;
  municipality: { nameSq: string } | null;
};

type CitizenReportsListProps = {
  reports: CitizenReportListItem[];
  emptyMessage: string;
  variant: "active" | "closed";
};

export function CitizenReportsList({ reports, emptyMessage, variant }: CitizenReportsListProps) {
  if (reports.length === 0) {
    return <PortalEmptyState>{emptyMessage}</PortalEmptyState>;
  }

  return (
    <>
      <ul className="divide-y">
        {reports.map((report) => (
          <li key={report.id} className="flex items-start justify-between gap-4 py-3 text-sm">
            <div className="min-w-0">
              <Link
                href={`/ishmt/reports/${report.id}`}
                className="font-medium hover:text-primary"
              >
                {report.reportNumber}
              </Link>
              <p className="text-muted-foreground">
                {CITIZEN_REPORT_TYPE_LABELS[report.type]}
                {report.elevator ? ` · ${report.elevator.registryNumber}` : ""}
                {report.municipality ? ` · ${report.municipality.nameSq}` : ""}
              </p>
              <p className="mt-1 line-clamp-1 text-muted-foreground">{report.description}</p>
              {variant === "closed" && report.resolutionNotes && (
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {report.resolutionNotes}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {variant === "active" && (
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${REPORT_PRIORITY_CLASS[report.priority]}`}
                >
                  {REPORT_PRIORITY_LABELS[report.priority]}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {CITIZEN_REPORT_STATUS_LABELS[report.status]}
              </span>
              {variant === "closed" && report.resolvedAt && (
                <span className="text-xs text-muted-foreground">
                  {new Date(report.resolvedAt).toLocaleDateString("sq-AL")}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <OfficialTableFooter total={reports.length} label="raportime" />
    </>
  );
}

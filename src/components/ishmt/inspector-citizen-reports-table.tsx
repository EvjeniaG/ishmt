import Link from "next/link";
import { OfficialTableFooter, RegistryNumber } from "@/components/shared/institutional";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import { formatDateSq } from "@/lib/format-date";
import {
  CITIZEN_REPORT_STATUS_LABELS,
  CITIZEN_REPORT_TYPE_LABELS,
  REPORT_PRIORITY_CLASS,
  REPORT_PRIORITY_LABELS,
} from "@/lib/registration/report-labels";
import type { CitizenReportStatus, CitizenReportType, ReportPriority } from "@prisma/client";

export type InspectorCitizenReportRow = {
  id: string;
  reportNumber: string;
  type: CitizenReportType;
  status: CitizenReportStatus;
  priority: ReportPriority;
  locationAddress: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  elevator: { id: string; registryNumber: string } | null;
  municipality: { nameSq: string } | null;
};

function locationLabel(row: InspectorCitizenReportRow) {
  const parts = [row.locationAddress, row.municipality?.nameSq].filter(Boolean);
  return parts.length ? parts.join(" · ") : "-";
}

export function InspectorCitizenReportsTable({
  rows,
  variant = "active",
  emptyMessage,
}: {
  rows: InspectorCitizenReportRow[];
  variant?: "active" | "closed";
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <PortalEmptyState>{emptyMessage}</PortalEmptyState>;
  }

  return (
    <>
      <PortalTableWrap>
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Nr. raportit</th>
            <th>Lloji</th>
            <th>Statusi</th>
            {variant === "active" ? <th>Prioriteti</th> : null}
            <th>Vendndodhja</th>
            <th>{variant === "active" ? "Data" : "Mbyllur"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td className="tabular-nums text-muted-foreground">{index + 1}</td>
              <td>
                <RegistryNumber>{row.reportNumber}</RegistryNumber>
                {row.elevator ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{row.elevator.registryNumber}</p>
                ) : null}
              </td>
              <td>{CITIZEN_REPORT_TYPE_LABELS[row.type]}</td>
              <td>
                <WorkflowStatusChip
                  label={CITIZEN_REPORT_STATUS_LABELS[row.status]}
                  tone={
                    row.status === "INVESTIGATING" || row.status === "ASSIGNED"
                      ? "waiting"
                      : row.status === "RESOLVED"
                        ? "done"
                        : "neutral"
                  }
                />
              </td>
              {variant === "active" ? (
                <td>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${REPORT_PRIORITY_CLASS[row.priority]}`}
                  >
                    {REPORT_PRIORITY_LABELS[row.priority]}
                  </span>
                </td>
              ) : null}
              <td className="max-w-[14rem] truncate text-muted-foreground">{locationLabel(row)}</td>
              <td className="tabular-nums text-muted-foreground">
                {formatDateSq(variant === "active" ? row.createdAt : row.resolvedAt ?? row.createdAt)}
              </td>
              <td>
                <Link href={`/ishmt/reports/${row.id}`} className="portal-table-link">
                  {variant === "active" ? "Hap raportin" : "Shiko raportin"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </PortalTableWrap>
      <OfficialTableFooter total={rows.length} label="raportime" />
    </>
  );
}

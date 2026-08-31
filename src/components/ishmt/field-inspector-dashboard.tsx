import Link from "next/link";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { IshmtAlarmBoard } from "@/components/ishmt/ishmt-alarm-board";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { MetricCard } from "@/components/shared/metric-card";
import {
  OfficialTableFooter,
  RegistryNumber,
  SectionCard,
} from "@/components/shared/institutional";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import type { RoleCode } from "@/lib/constants/roles";
import { formatDateSq } from "@/lib/format-date";
import type { IshmtAlarm } from "@/lib/ishmt/dashboard-alarms";
import { groupIshmtAlarmsByPriority } from "@/lib/ishmt/dashboard-alarms";
import {
  FIELD_INSPECTION_STATUS_LABELS,
  FIELD_INSPECTION_STATUS_TONE,
} from "@/lib/ishmt/field-inspection-labels";
import type { FieldInspectionAssignmentRow } from "@/components/ishmt/field-inspection-panels";
import type {
  InspectorDocumentReviewRow,
  InspectorWorkloadSummary,
} from "@/lib/services/field-inspector-workload-service";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import { FieldInspectionAssignmentStatus } from "@prisma/client";

function locationLabel(row: InspectorDocumentReviewRow) {
  const parts = [row.buildingAddress, row.municipalityName].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function fieldLocationLabel(a: FieldInspectionAssignmentRow) {
  const address = a.elevator?.buildingAddress ?? a.application?.data?.buildingAddress ?? "—";
  const municipality =
    a.elevator?.municipality?.nameSq ?? a.application?.data?.municipality?.nameSq ?? "—";
  return `${address} · ${municipality}`;
}

function fieldTargetLabel(a: FieldInspectionAssignmentRow) {
  if (a.elevator) return a.elevator.registryNumber;
  if (a.application) return a.application.applicationNumber;
  return "—";
}

function fieldDetailHref(a: FieldInspectionAssignmentRow) {
  if (a.application) return `/ishmt/review/${a.application.id}`;
  if (a.elevator) return `/ishmt/elevators/${a.elevator.id}`;
  return "/ishmt/my-field-inspections";
}

function ActiveDocumentReviewsTable({ rows }: { rows: InspectorDocumentReviewRow[] }) {
  if (rows.length === 0) {
    return (
      <PortalEmptyState>Nuk keni dosje aktive për shqyrtim dokumentacioni.</PortalEmptyState>
    );
  }

  return (
    <>
      <PortalTableWrap>
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Nr. aplikimit</th>
            <th>Lloji</th>
            <th>Vendndodhja</th>
            <th>Terren</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.assignmentId}>
              <td className="tabular-nums text-muted-foreground">{index + 1}</td>
              <td>
                <RegistryNumber>{row.applicationNumber}</RegistryNumber>
              </td>
              <td>{APPLICATION_TYPE_LABELS[row.type] ?? row.type}</td>
              <td className="max-w-[14rem] truncate text-muted-foreground">{locationLabel(row)}</td>
              <td>
                {row.requiresFieldVerification ? (
                  <WorkflowStatusChip label="Kërkohet" tone="waiting" />
                ) : (
                  <span className="text-sm text-muted-foreground">Jo</span>
                )}
              </td>
              <td>
                <Link href={`/ishmt/review/${row.applicationId}`} className="portal-table-link">
                  Shqyrto dosjen
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </PortalTableWrap>
      <OfficialTableFooter total={rows.length} />
    </>
  );
}

function ActiveFieldInspectionsTable({ rows }: { rows: FieldInspectionAssignmentRow[] }) {
  const active = rows.filter(
    (a) =>
      a.status === FieldInspectionAssignmentStatus.SCHEDULED ||
      a.status === FieldInspectionAssignmentStatus.IN_PROGRESS,
  );

  if (active.length === 0) {
    return <PortalEmptyState>Nuk keni detyra aktive në terren.</PortalEmptyState>;
  }

  return (
    <>
      <PortalTableWrap>
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Referenca</th>
            <th>Vendndodhja</th>
            <th>Data</th>
            <th>Statusi</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {active.map((row, index) => (
            <tr key={row.id}>
              <td className="tabular-nums text-muted-foreground">{index + 1}</td>
              <td>
                <RegistryNumber>{fieldTargetLabel(row)}</RegistryNumber>
              </td>
              <td className="max-w-[14rem] truncate text-muted-foreground">{fieldLocationLabel(row)}</td>
              <td className="tabular-nums text-muted-foreground">{formatDateSq(row.scheduledDate)}</td>
              <td>
                <WorkflowStatusChip
                  label={FIELD_INSPECTION_STATUS_LABELS[row.status]}
                  tone={FIELD_INSPECTION_STATUS_TONE[row.status]}
                />
              </td>
              <td>
                <Link href={fieldDetailHref(row)} className="portal-table-link">
                  Hap detyrën
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </PortalTableWrap>
      <OfficialTableFooter total={active.length} />
    </>
  );
}

function HistoryDocumentReviewsTable({
  rows,
  roleCode,
}: {
  rows: InspectorDocumentReviewRow[];
  roleCode: string;
}) {
  if (rows.length === 0) {
    return (
      <PortalEmptyState>
        Ende nuk keni përfunduar shqyrtime dokumentacioni. Dosjet e përfunduara do të shfaqen këtu.
      </PortalEmptyState>
    );
  }

  return (
    <>
      <PortalTableWrap>
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Nr. aplikimit</th>
            <th>Lloji</th>
            <th>Statusi i dosjes</th>
            <th>Përfunduar</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.assignmentId}>
              <td className="tabular-nums text-muted-foreground">{index + 1}</td>
              <td>
                <RegistryNumber>{row.applicationNumber}</RegistryNumber>
              </td>
              <td>{APPLICATION_TYPE_LABELS[row.type] ?? row.type}</td>
              <td>
                <ApplicationStatusBadge
                  status={row.status}
                  type={row.type}
                  roleCode={roleCode as RoleCode}
                />
              </td>
              <td className="tabular-nums text-muted-foreground">
                {row.completedAt ? formatDateSq(row.completedAt) : "—"}
              </td>
              <td>
                <Link href={`/ishmt/review/${row.applicationId}`} className="portal-table-link">
                  Shiko dosjen e plotë
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </PortalTableWrap>
      <OfficialTableFooter total={rows.length} label="dosje" />
    </>
  );
}

export function FieldInspectorDashboard({
  summary,
  pendingDocumentReviews,
  completedDocumentReviews,
  fieldInspections,
  alarms,
  roleCode,
}: {
  summary: InspectorWorkloadSummary;
  pendingDocumentReviews: InspectorDocumentReviewRow[];
  completedDocumentReviews: InspectorDocumentReviewRow[];
  fieldInspections: FieldInspectionAssignmentRow[];
  alarms: IshmtAlarm[];
  roleCode: string;
}) {
  const grouped = groupIshmtAlarmsByPriority(alarms);
  const activeFieldCount =
    summary.pendingFieldInspections + summary.inProgressFieldInspections;

  return (
    <StandardPageLayout
      eyebrow="IQMT · Inspektor"
      title="Paneli im"
      description="Dosjet e caktuara për shqyrtim, detyrat në terren dhe historiku i punës suaj."
    >
      <div className="portal-kpi-grid">
        <MetricCard
          label="Shqyrtim dokumentacioni"
          value={summary.pendingDocumentReviews}
          accent={summary.pendingDocumentReviews > 0 ? "warning" : "success"}
          subtitle="Dosje në pritje të raportit"
        />
        <MetricCard
          label="Detyra në terren"
          value={activeFieldCount}
          accent={activeFieldCount > 0 ? "warning" : "primary"}
          subtitle={
            summary.inProgressFieldInspections > 0
              ? `${summary.inProgressFieldInspections} në objekt`
              : "Të planifikuara ose aktive"
          }
        />
        <MetricCard
          label="Dosje të përfunduara"
          value={summary.completedDocumentReviews}
          accent="success"
          subtitle="Historiku i shqyrtimeve tuaja"
        />
        <MetricCard
          label="Inspektime terreni"
          value={summary.completedFieldInspections}
          accent="primary"
          subtitle="Verifikime të kryera"
        />
      </div>

      {grouped.all.length > 0 ? (
        <SectionCard
          title="Kërkon veprim"
          subtitle="Detyrat që presin hapin tuaj"
          meta={
            <span className="workflow-status-outline tabular-nums">
              {grouped.all.length} prioritete
            </span>
          }
        >
          <IshmtAlarmBoard alarms={alarms} />
        </SectionCard>
      ) : null}

      <SectionCard
        title="Shqyrtim dokumentacioni"
        subtitle="Dosjet e plota të caktuara nga përgjegjësi i sektorit"
        meta={
          <Link
            href="/ishmt/my-application-reviews"
            className="text-sm font-medium text-gov-primary hover:underline"
          >
            Shiko listën e plotë →
          </Link>
        }
      >
        <ActiveDocumentReviewsTable rows={pendingDocumentReviews} />
      </SectionCard>

      <SectionCard
        title="Detyrat në terren"
        subtitle="Verifikime në objekt — aplikime ose ashensorë"
        meta={
          <Link
            href="/ishmt/my-field-inspections"
            className="text-sm font-medium text-gov-primary hover:underline"
          >
            Hap detyrat e terrenit →
          </Link>
        }
      >
        <ActiveFieldInspectionsTable rows={fieldInspections} />
      </SectionCard>

      <SectionCard
        title="Historiku i shqyrtimeve"
        subtitle="Dosjet që keni përfunduar — dosja e plotë mbetet e hapur edhe pas regjistrimit"
      >
        <HistoryDocumentReviewsTable
          rows={completedDocumentReviews}
          roleCode={roleCode as RoleCode}
        />
      </SectionCard>
    </StandardPageLayout>
  );
}

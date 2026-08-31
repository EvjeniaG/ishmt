import Link from "next/link";
import { redirect } from "next/navigation";
import { CitizenReportStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { DataSheet, SectionCard } from "@/components/shared/institutional";
import { ReportTriageActions } from "@/components/ishmt/report-triage-actions";
import { ReportAssignInspectorForm } from "@/components/ishmt/report-assign-inspector-form";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";
import { citizenReportHasActiveAssignment } from "@/lib/ishmt/citizen-report-queue";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { canAssignFieldInspections } from "@/lib/permissions/ishmt-roles";
import { CitizenReportService } from "@/lib/services/citizen-report-service";
import { IshmtFieldInspectionService } from "@/lib/services/ishmt-field-inspection-service";
import {
  CITIZEN_REPORT_STATUS_LABELS,
  CITIZEN_REPORT_TYPE_LABELS,
  REPORT_PRIORITY_CLASS,
  REPORT_PRIORITY_LABELS,
  describeCitizenReportAction,
} from "@/lib/registration/report-labels";
import { formatDateTimeSq } from "@/lib/format-date";
import { formatCitizenReportLocationDisplay } from "@/lib/ishmt/citizen-report-location";

export default async function CitizenReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const report = await CitizenReportService.getById(id);

  const canViewReport =
    roleHasPermission(session.user.roleCode, PERMISSIONS.REPORTS_VIEW) ||
    (session.user.roleCode === ROLE_CODES.FIELD_INSPECTOR &&
      report.assignedInspectorId === session.user.id);
  if (!canViewReport) redirect("/unauthorized");

  const canManage = roleHasPermission(session.user.roleCode, PERMISSIONS.REPORTS_MANAGE);
  const isAssignedInspector =
    session.user.roleCode === ROLE_CODES.FIELD_INSPECTOR &&
    report.assignedInspectorId === session.user.id;
  const canActOnReport = canManage || isAssignedInspector;
  const canAssignInspector =
    canManage &&
    canAssignFieldInspections(session.user.roleCode) &&
    roleHasPermission(session.user.roleCode, PERMISSIONS.INSPECTIONS_FIELD_ASSIGN);
  const canSelfAssign = session.user.roleCode === ROLE_CODES.FIELD_INSPECTOR;
  const assignedToMe = report.assignedInspector?.id === session.user.id;
  const hasAssignedInspector = citizenReportHasActiveAssignment(
    report.status,
    report.assignedInspectorId,
  );
  const closingAction = report.actions.find(
    (action) => action.action === "RESOLVED" || action.action === "DISMISSED",
  );
  const isClosed =
    report.status === CitizenReportStatus.RESOLVED ||
    report.status === CitizenReportStatus.DISMISSED;

  const inspectors =
    canAssignInspector && !isClosed
      ? await IshmtFieldInspectionService.listFieldInspectors({
          userId: session.user.id,
          email: session.user.email ?? "",
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          activeOrgId: session.user.activeOrgId,
          activeOrgType: session.user.activeOrgType,
          activeOrgName: session.user.activeOrgName,
          roleCode: session.user.roleCode,
          permissions: session.user.permissions,
        })
      : [];

  const location = formatCitizenReportLocationDisplay(report);

  return (
    <AppShell title="Raporti i qytetarit">
      <StandardPageLayout
        eyebrow="IQMT · Raportime publike"
        title={report.reportNumber}
        description={CITIZEN_REPORT_TYPE_LABELS[report.type]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${REPORT_PRIORITY_CLASS[report.priority]}`}
            >
              {REPORT_PRIORITY_LABELS[report.priority]}
            </span>
            <span className="text-sm text-muted-foreground">
              {CITIZEN_REPORT_STATUS_LABELS[report.status]}
            </span>
          </div>
        }
      >
        <SectionCard title="Detajet e raportit" subtitle="Informacioni i parashtruar nga qytetari" padded>
          <DataSheet
            columns={2}
            items={[
              { label: "Lloji", value: CITIZEN_REPORT_TYPE_LABELS[report.type] },
              { label: "Data", value: new Date(report.createdAt).toLocaleString("sq-AL") },
              {
                label: "Ashensori",
                value: report.elevator ? (
                  <Link
                    href={`/portal/elevators/${report.elevator.id}`}
                    className="text-primary hover:underline"
                  >
                    {report.elevator.registryNumber}
                  </Link>
                ) : (
                  "-"
                ),
              },
              { label: "Bashkia", value: report.municipality?.nameSq ?? "-" },
              {
                label: "Vendndodhja",
                value:
                  location.placeName && location.mapsUrl ? (
                    <span className="space-y-1">
                      <span className="block">{location.placeName}</span>
                      <Link
                        href={location.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Shiko në hartë
                      </Link>
                    </span>
                  ) : location.mapsUrl ? (
                    <Link
                      href={location.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Shiko në hartë
                    </Link>
                  ) : (
                    location.text
                  ),
              },
              {
                label: "Inspektori i caktuar",
                value: hasAssignedInspector && report.assignedInspector
                  ? `${report.assignedInspector.firstName} ${report.assignedInspector.lastName}`
                  : "-",
              },
              ...(isClosed && closingAction
                ? [
                    {
                      label: "Mbyllur nga",
                      value: `${closingAction.actor.firstName} ${closingAction.actor.lastName}`,
                    },
                  ]
                : []),
              ...(report.resolvedAt
                ? [
                    {
                      label: "Data e mbylljes",
                      value: new Date(report.resolvedAt).toLocaleString("sq-AL"),
                    },
                  ]
                : []),
              { label: "Përshkrimi", value: report.description },
              ...(report.resolutionNotes
                ? [{ label: "Shënimi i zgjidhjes", value: report.resolutionNotes }]
                : []),
            ]}
          />
        </SectionCard>

        <SectionCard title="Kontakti i raportuesit" subtitle="Të dhënat e kontaktit" padded>
          <DataSheet
            columns={2}
            items={[
              { label: "Emri dhe mbiemri", value: report.reporterName ?? "-" },
              { label: "Telefoni", value: report.reporterPhone ?? "-" },
              { label: "Email", value: report.reporterEmail ?? "-" },
            ]}
          />
        </SectionCard>

        {canAssignInspector && (
          <SectionCard
            title="Caktimi i inspektorit"
            subtitle="Zgjidhni inspektorin terreni që do të hetojë raportin"
            padded
          >
            <ReportAssignInspectorForm
              reportId={report.id}
              inspectors={inspectors}
              currentInspectorId={report.assignedInspectorId}
              currentInspectorName={
                report.assignedInspector
                  ? `${report.assignedInspector.firstName} ${report.assignedInspector.lastName}`.trim()
                  : null
              }
            />
          </SectionCard>
        )}

        {canActOnReport && (
          <SectionCard title="Veprimet e inspektorit" subtitle="Menaxhimi dhe zgjidhja e raportit" padded>
            <ReportTriageActions
              reportId={report.id}
              status={report.status}
              assignedToMe={assignedToMe}
              canSelfAssign={canSelfAssign && canManage}
              mode={isAssignedInspector && !canManage ? "assigned_inspector" : "staff"}
            />
          </SectionCard>
        )}

        {report.actions.length > 0 && (
          <SectionCard title="Historia e veprimeve" subtitle="Gjurmë e plotë e ndryshimeve" padded>
            <ul className="space-y-3">
              {report.actions.map((action) => {
                const { label, detail } = describeCitizenReportAction(
                  action.action,
                  action.comment,
                );
                return (
                  <li
                    key={action.id}
                    className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 last:border-b"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-gov-primary">{label}</p>
                      <time className="text-xs text-muted-foreground">
                        {formatDateTimeSq(action.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {action.actor.firstName} {action.actor.lastName}
                    </p>
                    {detail && <p className="mt-2 text-sm text-foreground/90">{detail}</p>}
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        )}
      </StandardPageLayout>
    </AppShell>
  );
}

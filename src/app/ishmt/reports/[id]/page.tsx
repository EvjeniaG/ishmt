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
} from "@/lib/registration/report-labels";

export default async function CitizenReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.REPORTS_VIEW)) {
    redirect("/unauthorized");
  }

  const report = await CitizenReportService.getById(id);
  const canManage = roleHasPermission(session.user.roleCode, PERMISSIONS.REPORTS_MANAGE);
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

  return (
    <AppShell title="Raporti i qytetarit">
      <StandardPageLayout
        eyebrow="ISHMT · Raportime publike"
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
              { label: "Vendndodhja", value: report.locationAddress ?? "-" },
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

        <SectionCard title="Kontakti i raportuesit" subtitle="Të dhënat e kontaktit (nëse janë dhënë)" padded>
          <DataSheet
            columns={2}
            items={[
              { label: "Emri", value: report.reporterName ?? "Anonim" },
              { label: "Email", value: report.reporterEmail ?? "-" },
              { label: "Telefoni", value: report.reporterPhone ?? "-" },
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
            />
          </SectionCard>
        )}

        {canManage && (
          <SectionCard title="Veprimet e inspektorit" subtitle="Menaxhimi dhe zgjidhja e raportit" padded>
            <ReportTriageActions
              reportId={report.id}
              status={report.status}
              assignedToMe={assignedToMe}
              canSelfAssign={canSelfAssign}
            />
          </SectionCard>
        )}

        {report.actions.length > 0 && (
          <SectionCard title="Historia e veprimeve" subtitle="Gjurmë e plotë e ndryshimeve" padded>
            <ul className="space-y-2 text-sm">
              {report.actions.map((action) => (
                <li key={action.id} className="border-b pb-2 last:border-0">
                  <span className="font-medium">{action.action}</span> -{" "}
                  {action.actor.firstName} {action.actor.lastName} ·{" "}
                  {new Date(action.createdAt).toLocaleString("sq-AL")}
                  {action.comment && <p className="text-muted-foreground">{action.comment}</p>}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </StandardPageLayout>
    </AppShell>
  );
}

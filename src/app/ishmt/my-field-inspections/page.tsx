import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { IshmtAlarmBoard } from "@/components/ishmt/ishmt-alarm-board";
import { MyFieldInspectionsList } from "@/components/ishmt/field-inspection-panels";
import { FieldInspectionTaskBriefing } from "@/components/applications/field-inspector-review-briefing";
import { SectionCard } from "@/components/shared/institutional";
import { MetricCard } from "@/components/shared/metric-card";
import { getAuthSession } from "@/lib/auth";
import { groupIshmtAlarmsByPriority } from "@/lib/ishmt/dashboard-alarms";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { IshmtAlarmService } from "@/lib/services/ishmt-alarm-service";
import { IshmtFieldInspectionService } from "@/lib/services/ishmt-field-inspection-service";

export default async function MyFieldInspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.INSPECTIONS_FIELD_VIEW_OWN)) {
    redirect("/unauthorized");
  }

  const { applicationId } = await searchParams;

  const ctx = {
    userId: session.user.id,
    email: session.user.email ?? "",
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    activeOrgId: session.user.activeOrgId,
    activeOrgType: session.user.activeOrgType,
    activeOrgName: session.user.activeOrgName,
    roleCode: session.user.roleCode,
    permissions: session.user.permissions,
  };

  const [assignments, alarms] = await Promise.all([
    IshmtFieldInspectionService.listMine(ctx),
    IshmtAlarmService.getAlarms(ctx),
  ]);

  const activeCount = assignments.filter((a) => a.status === "SCHEDULED" || a.status === "IN_PROGRESS").length;
  const inProgressCount = assignments.filter((a) => a.status === "IN_PROGRESS").length;
  const scheduledCount = assignments.filter((a) => a.status === "SCHEDULED").length;
  const completedCount = assignments.filter((a) => a.status === "COMPLETED").length;

  const grouped = groupIshmtAlarmsByPriority(alarms);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="IQMT · Inspektor"
        title="Detyrat e mia në terren"
        description="Verifikime në objekt të caktuara nga IQMT — konfirmoni nisjen, plotësoni rezultatin dhe ngarkoni raportin."
      >
        <FieldInspectionTaskBriefing />

        <div className="portal-kpi-grid">
          <MetricCard
            label="Aktive"
            value={activeCount}
            accent={activeCount > 0 ? "warning" : "primary"}
            subtitle={
              inProgressCount > 0
                ? `${inProgressCount} në objekt`
                : "Të planifikuara ose në terren"
            }
          />
          <MetricCard
            label="Të planifikuara"
            value={scheduledCount}
            accent="primary"
            subtitle="Presin konfirmimin e nisjes"
          />
          <MetricCard
            label="Përfunduar"
            value={completedCount}
            accent="success"
            subtitle="Verifikime të regjistruara"
          />
          <MetricCard
            label="Gjithsej"
            value={assignments.length}
            accent="primary"
            subtitle="Të gjitha detyrat tuaja"
          />
        </div>

        {grouped.all.length > 0 ? (
          <SectionCard
            title="Kërkon veprim"
            subtitle="Detyrat e planifikuara ose në objekt"
            meta={
              <span className="workflow-status-outline tabular-nums">
                {grouped.all.length} alarme
              </span>
            }
          >
            <IshmtAlarmBoard alarms={alarms} />
          </SectionCard>
        ) : null}

        <SectionCard
          title="Detyrat"
          subtitle="Aktive dhe të përfunduara"
        >
          <MyFieldInspectionsList
            assignments={assignments}
            highlightApplicationId={applicationId ?? null}
          />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

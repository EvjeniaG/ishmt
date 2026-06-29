import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { IshmtAlarmBoard } from "@/components/ishmt/ishmt-alarm-board";
import { MyFieldInspectionsList } from "@/components/ishmt/field-inspection-panels";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { groupIshmtAlarmsByPriority } from "@/lib/ishmt/dashboard-alarms";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { IshmtAlarmService } from "@/lib/services/ishmt-alarm-service";
import { IshmtFieldInspectionService } from "@/lib/services/ishmt-field-inspection-service";

export default async function MyFieldInspectionsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.INSPECTIONS_FIELD_VIEW_OWN)) {
    redirect("/unauthorized");
  }

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

  const grouped = groupIshmtAlarmsByPriority(alarms);

  return (
    <AppShell title="Detyrat e mia">
      <div className="space-y-6">
        <PageHeader
          eyebrow="ISHMT"
          title="Detyrat e mia"
        />

        <SectionCard
          title="Kërkon veprim"
          subtitle="Detyrat e planifikuara ose në objekt"
          meta={
            grouped.all.length > 0 ? (
              <span className="workflow-status-outline tabular-nums">
                {grouped.all.length} alarme
              </span>
            ) : undefined
          }
          padded
        >
          <IshmtAlarmBoard alarms={alarms} />
        </SectionCard>

        <SectionCard
          title="Detyrat"
          meta={
            <span className="workflow-status-outline tabular-nums">
              {activeCount} aktive · {assignments.length} gjithsej
            </span>
          }
          padded
        >
          <MyFieldInspectionsList assignments={assignments} />
        </SectionCard>
      </div>
    </AppShell>
  );
}

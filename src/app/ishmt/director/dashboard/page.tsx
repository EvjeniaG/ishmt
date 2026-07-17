import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorDashboard } from "@/components/director/director-dashboard";
import { getAuthSession } from "@/lib/auth";
import { canDirectApplications } from "@/lib/permissions/ishmt-roles";
import { IshmtAlarmService } from "@/lib/services/ishmt-alarm-service";
import { IshmtDashboardService } from "@/lib/services/ishmt-dashboard-service";

export default async function DirectorDashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!canDirectApplications(session.user.roleCode)) redirect("/unauthorized");

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

  const [alarms, metrics] = await Promise.all([
    IshmtAlarmService.getAlarms(ctx),
    IshmtDashboardService.getMetrics(),
  ]);

  return (
    <AppShell title="Paneli operativ">
      <DirectorDashboard alarms={alarms} metrics={metrics} />
    </AppShell>
  );
}

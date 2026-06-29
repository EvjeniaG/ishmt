import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ChiefDashboard } from "@/components/chief/chief-dashboard";
import { getAuthSession } from "@/lib/auth";
import { IshmtAlarmService } from "@/lib/services/ishmt-alarm-service";
import { IshmtDashboardService } from "@/lib/services/ishmt-dashboard-service";
import { canApproveApplications } from "@/lib/permissions/ishmt-roles";

export default async function ChiefDashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!canApproveApplications(session.user.roleCode)) redirect("/unauthorized");

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
      <ChiefDashboard alarms={alarms} metrics={metrics} />
    </AppShell>
  );
}

import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { IshmtDashboard } from "@/components/ishmt/ishmt-dashboard";
import { getAuthSession } from "@/lib/auth";
import { IshmtAlarmService } from "@/lib/services/ishmt-alarm-service";
import { IshmtDashboardService } from "@/lib/services/ishmt-dashboard-service";
import { ROLE_CODES } from "@/lib/constants/roles";
import { getDashboardPathForRole } from "@/lib/permissions/nav-paths";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export default async function IshmtDashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.roleCode;
  const expectedPath = getDashboardPathForRole(role);

  if (expectedPath !== "/ishmt/dashboard") {
    redirect(expectedPath);
  }

  if (!isIshmtStaffRole(role) || role === ROLE_CODES.FIELD_INSPECTOR) {
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

  const [alarms, metrics] = await Promise.all([
    IshmtAlarmService.getAlarms(ctx),
    IshmtDashboardService.getMetrics(),
  ]);

  return (
    <AppShell title="ISHMT">
      <IshmtDashboard alarms={alarms} metrics={metrics} roleCode={role} />
    </AppShell>
  );
}

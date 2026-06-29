import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OwnerDashboard } from "@/components/owner/owner-dashboard";
import { InstallerDashboard } from "@/components/installer/installer-dashboard";
import { CertifierDashboard } from "@/components/certifier/certifier-dashboard";
import { MaintenanceDashboardPanel } from "@/components/maintenance/maintenance-dashboard";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { OwnerDashboardService } from "@/lib/services/owner-dashboard-service";
import { InstallerDashboardService } from "@/lib/services/installer-dashboard-service";
import { CertifierDashboardService } from "@/lib/services/certifier-dashboard-service";
import { MaintenanceDashboardService } from "@/lib/services/maintenance-dashboard-service";
import { getDashboardPathForRole } from "@/lib/permissions/nav-paths";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export default async function PortalDashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const roleCode = session.user.roleCode;

  if (isIshmtStaffRole(roleCode) || roleCode === ROLE_CODES.DIRECTORATE) {
    redirect(getDashboardPathForRole(roleCode));
  }

  const ctx = await requireAuthForPage();

  if (roleCode === ROLE_CODES.OWNER) {
    const dashboard = await OwnerDashboardService.getDashboard(ctx);
    return (
      <AppShell>
        <OwnerDashboard data={dashboard} />
      </AppShell>
    );
  }

  if (roleCode === ROLE_CODES.INSTALLER) {
    const dashboard = await InstallerDashboardService.getDashboard(ctx);
    return (
      <AppShell>
        <InstallerDashboard data={dashboard} />
      </AppShell>
    );
  }

  if (roleCode === ROLE_CODES.CERTIFIER) {
    const dashboard = await CertifierDashboardService.getDashboard(ctx);
    return (
      <AppShell>
        <CertifierDashboard data={dashboard} />
      </AppShell>
    );
  }

  if (roleCode === ROLE_CODES.MAINTENANCE) {
    const dashboard = await MaintenanceDashboardService.getDashboard(ctx);
    return (
      <AppShell>
        <MaintenanceDashboardPanel data={dashboard} />
      </AppShell>
    );
  }

  redirect("/unauthorized");
}

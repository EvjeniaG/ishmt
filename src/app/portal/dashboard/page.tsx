import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OwnerDashboard } from "@/components/owner/owner-dashboard";
import { InstallerDashboard } from "@/components/installer/installer-dashboard";
import { CertifierDashboard } from "@/components/certifier/certifier-dashboard";
import { MaintenanceDashboardPanel } from "@/components/maintenance/maintenance-dashboard";
import { ServiceProviderDashboard } from "@/components/service-provider/service-provider-dashboard";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { OwnerDashboardService } from "@/lib/services/owner-dashboard-service";
import { InstallerDashboardService } from "@/lib/services/installer-dashboard-service";
import { CertifierDashboardService } from "@/lib/services/certifier-dashboard-service";
import { MaintenanceDashboardService } from "@/lib/services/maintenance-dashboard-service";
import { ServiceProviderDashboardService } from "@/lib/services/service-provider-dashboard-service";
import { db } from "@/lib/db";
import { getDashboardPathForRole } from "@/lib/permissions/nav-paths";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import {
  hasServiceCapability,
  isMultiCapabilityProvider,
} from "@/lib/organizations/org-capabilities";

export default async function PortalDashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const roleCode = session.user.roleCode;

  if (isIshmtStaffRole(roleCode) || roleCode === ROLE_CODES.DIRECTORATE) {
    redirect(getDashboardPathForRole(roleCode));
  }

  const ctx = await requireAuthForPage();
  const caps = ctx.orgCapabilities;

  if (isMultiCapabilityProvider(caps)) {
    const [dashboard, activeOrg] = await Promise.all([
      ServiceProviderDashboardService.getDashboard(ctx),
      db.organization.findUnique({
        where: { id: ctx.activeOrgId },
        select: { nipt: true },
      }),
    ]);
    return (
      <AppShell>
        <ServiceProviderDashboard data={dashboard} activeNipt={activeOrg?.nipt ?? null} />
      </AppShell>
    );
  }

  if (roleCode === ROLE_CODES.OWNER) {
    const dashboard = await OwnerDashboardService.getDashboard(ctx);
    return (
      <AppShell>
        <OwnerDashboard data={dashboard} />
      </AppShell>
    );
  }

  if (hasServiceCapability(ctx, "install")) {
    const dashboard = await InstallerDashboardService.getDashboard(ctx);
    return (
      <AppShell>
        <InstallerDashboard data={dashboard} />
      </AppShell>
    );
  }

  if (hasServiceCapability(ctx, "om")) {
    const dashboard = await CertifierDashboardService.getDashboard(ctx);
    return (
      <AppShell>
        <CertifierDashboard data={dashboard} />
      </AppShell>
    );
  }

  if (hasServiceCapability(ctx, "maintenance")) {
    const dashboard = await MaintenanceDashboardService.getDashboard(ctx);
    return (
      <AppShell>
        <MaintenanceDashboardPanel data={dashboard} />
      </AppShell>
    );
  }

  redirect("/unauthorized");
}

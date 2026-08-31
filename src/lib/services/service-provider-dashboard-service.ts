import type { AuthContext } from "@/lib/permissions/guards";
import type { OrgCapabilities } from "@/lib/organizations/org-capabilities";
import { InstallerDashboardService } from "@/lib/services/installer-dashboard-service";
import { MaintenanceDashboardService } from "@/lib/services/maintenance-dashboard-service";
import { CertifierDashboardService } from "@/lib/services/certifier-dashboard-service";

export type ServiceProviderDashboardData = {
  caps: OrgCapabilities;
  install: Awaited<ReturnType<typeof InstallerDashboardService.getDashboard>> | null;
  maintenance: Awaited<ReturnType<typeof MaintenanceDashboardService.getDashboard>> | null;
  om: Awaited<ReturnType<typeof CertifierDashboardService.getDashboard>> | null;
};

export class ServiceProviderDashboardService {
  static async getDashboard(ctx: AuthContext): Promise<ServiceProviderDashboardData> {
    const caps = ctx.orgCapabilities ?? {
      capInstall: false,
      capMaintenance: false,
      capOm: false,
    };

    const [install, maintenance, om] = await Promise.all([
      caps.capInstall ? InstallerDashboardService.getDashboard(ctx) : Promise.resolve(null),
      caps.capMaintenance ? MaintenanceDashboardService.getDashboard(ctx) : Promise.resolve(null),
      caps.capOm ? CertifierDashboardService.getDashboard(ctx) : Promise.resolve(null),
    ]);

    return { caps, install, maintenance, om };
  }
}

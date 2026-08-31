import { AppShell } from "@/components/layout/app-shell";
import {
  loadOrgServiceContracts,
  OrgServiceContractsPage,
} from "@/components/contracts/org-service-contracts-page";
import { requireServiceCapabilityForPage } from "@/lib/auth/page-guards";
import { MaintenanceWorkService } from "@/lib/services/maintenance-work-service";

export default async function MaintenanceContractsPage() {
  const ctx = await requireServiceCapabilityForPage("maintenance");
  const [pending, allContracts] = await Promise.all([
    MaintenanceWorkService.listPendingContracts(ctx),
    loadOrgServiceContracts(ctx.activeOrgId, "MAINTENANCE"),
  ]);

  return (
    <AppShell title="Kontratat">
      <OrgServiceContractsPage
        eyebrow="Portali · Mirëmbajtje"
        title="Kontratat e mirëmbajtjes"
        description="Ftesa, kontrata aktive dhe historiku i kontratave të mirëmbajtjes"
        serviceType="MAINTENANCE"
        pending={pending}
        allContracts={allContracts}
      />
    </AppShell>
  );
}

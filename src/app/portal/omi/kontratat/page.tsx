import { AppShell } from "@/components/layout/app-shell";
import {
  loadOrgServiceContracts,
  OrgServiceContractsPage,
} from "@/components/contracts/org-service-contracts-page";
import { requireServiceCapabilityForPage } from "@/lib/auth/page-guards";
import { MaintenanceWorkService } from "@/lib/services/maintenance-work-service";
import { certifierOrgHasMaintenanceAssignments } from "@/lib/certifier/certifier-maintenance-access";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import Link from "next/link";
import { PERIODIC_INSPECTION_CONTRACTS_LABEL } from "@/lib/constants/periodic-inspection-labels";

export default async function OmiKontratatPage() {
  const ctx = await requireServiceCapabilityForPage("om");
  const hasMaintenanceAssignments = await certifierOrgHasMaintenanceAssignments(ctx.activeOrgId);

  if (!hasMaintenanceAssignments) {
    return (
      <AppShell title="Kontratat e mirëmbajtjes">
        <StandardPageLayout
          eyebrow="Portali · Certifikues / OM"
          title="Kontratat e mirëmbajtjes"
          description="Organizata juaj nuk ofron shërbim mirëmbajtjeje në regjistër."
        >
          <p className="text-sm text-muted-foreground">
            Për {PERIODIC_INSPECTION_CONTRACTS_LABEL.toLowerCase()} shkoni te{" "}
            <Link href="/portal/omi/kontratat-kontrolli" className="font-medium text-gov-primary hover:underline">
              {PERIODIC_INSPECTION_CONTRACTS_LABEL}
            </Link>
            .
          </p>
        </StandardPageLayout>
      </AppShell>
    );
  }

  const [pending, allContracts] = await Promise.all([
    MaintenanceWorkService.listPendingContracts(ctx),
    loadOrgServiceContracts(ctx.activeOrgId, "MAINTENANCE"),
  ]);

  return (
    <AppShell title="Kontratat e mirëmbajtjes">
      <OrgServiceContractsPage
        eyebrow="Portali · Certifikues / OM"
        title="Kontratat e mirëmbajtjes"
        description="Kontratat e mirëmbajtjes shfaqen këtu sapo personi përgjegjës i ashensorit ju cakton si kompani shërbimi."
        serviceType="MAINTENANCE"
        pending={pending}
        allContracts={allContracts}
      />
    </AppShell>
  );
}

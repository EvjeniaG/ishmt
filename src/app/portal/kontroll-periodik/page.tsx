import { redirect } from "next/navigation";
import {
  OM_INSPECTION_ORG_LABEL,
  PERIODIC_INSPECTION_CONTRACTS_LABEL,
  PERIODIC_INSPECTION_LABEL,
} from "@/lib/constants/periodic-inspection-labels";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { OwnerElevatorContractsOverview } from "@/components/contracts/owner-elevator-contracts-overview";
import { InstitutionalNotice } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function OwnerInspectionContractsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.OWNER) redirect("/unauthorized");

  const items = await OwnerPortalService.listInspectionContracts(session.user.activeOrgId);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title={PERIODIC_INSPECTION_CONTRACTS_LABEL}
        description={`${OM_INSPECTION_ORG_LABEL} dhe kontratat aktive për çdo ashensor.`}
      >
        <InstitutionalNotice variant="info" title={PERIODIC_INSPECTION_LABEL}>
          Çdo ashensor duhet të ketë kontratë me një organizatë të miratuar për inspektimin periodik (OM), zakonisht çdo 6 muaj ose 1 vit.
        </InstitutionalNotice>

        <OwnerElevatorContractsOverview
          items={items}
          serviceType="PERIODIC_INSPECTION"
          emptyTitle="Nuk ka ashensorë aktivë."
          emptyDescription="Caktoni OM-n nga dosja e secilit ashensor ose nga skeda Inspektime periodike."
        />
      </StandardPageLayout>
    </AppShell>
  );
}

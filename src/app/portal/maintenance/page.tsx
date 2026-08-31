import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { OwnerElevatorContractsOverview } from "@/components/contracts/owner-elevator-contracts-overview";
import { InstitutionalNotice } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function OwnerMaintenancePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.OWNER) redirect("/unauthorized");

  const items = await OwnerPortalService.listMaintenance(session.user.activeOrgId);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="Kontratat e mirëmbajtjes"
        description="Kompania e mirëmbajtjes dhe kontratat aktive për çdo ashensor."
      >
        <InstitutionalNotice variant="warning" title="Kusht për caktim">
          Vetëm kompanitë e mirëmbajtjes me status <strong>AKTIV</strong> dhe <strong>QKB të validuar</strong> mund të caktohen.
        </InstitutionalNotice>

        <OwnerElevatorContractsOverview
          items={items}
          serviceType="MAINTENANCE"
          emptyTitle="Nuk ka ashensorë aktivë."
          emptyDescription="Caktoni kompaninë e mirëmbajtjes nga dosja e ashensorit ose skeda Mirëmbajtje."
        />
      </StandardPageLayout>
    </AppShell>
  );
}

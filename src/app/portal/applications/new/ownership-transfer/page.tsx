import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationTypeGuide } from "@/components/applications/application-type-guide";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { OwnershipTransferApplicationForm } from "@/components/owner/typed-application-forms";
import { ElevatorService } from "@/lib/services/elevator-service";
import { getAuthSession } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";

export default async function OwnershipTransferApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ elevatorId?: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_CREATE)) redirect("/unauthorized");

  const { elevatorId } = await searchParams;
  const elevators = await ElevatorService.listForOwner(session.user.activeOrgId);

  return (
    <AppShell title="Transferim pronësie">
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="Transferim pronësie"
        description="Kaloni kartelën te subjekt tjetër - marrësi pranon, pastaj IQMT miraton"
        actions={
          <Link href="/portal/applications/new" className="text-sm text-primary hover:underline">
            ← Kthehu te llojet e aplikimeve
          </Link>
        }
      >
        <SectionCard title="Formulari i transferimit" padded>
          <div className="space-y-6">
            <ApplicationTypeGuide guideKey="OWNERSHIP_TRANSFER" />
            <OwnershipTransferApplicationForm
              elevators={elevators.map((e) => ({
                id: e.id,
                registryNumber: e.registryNumber,
                address: e.buildingAddress,
              }))}
              defaultElevatorId={elevatorId}
            />
          </div>
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

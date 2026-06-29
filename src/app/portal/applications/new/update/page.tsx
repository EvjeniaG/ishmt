import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationType } from "@prisma/client";
import { ApplicationTypeGuide } from "@/components/applications/application-type-guide";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { SimpleTypedApplicationForm } from "@/components/owner/typed-application-forms";
import { ElevatorService } from "@/lib/services/elevator-service";
import { getAuthSession } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";

export default async function UpdateApplicationPage({
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
    <AppShell title="Përditësim të dhënave">
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="Përditësim të dhënave"
        description="Adresë, mirëmbajtje, kontakt - pronësia mbetet e njëjta"
        actions={
          <Link href="/portal/applications/new" className="text-sm text-primary hover:underline">
            ← Kthehu te llojet e aplikimeve
          </Link>
        }
      >
        <SectionCard title="Formulari i përditësimit" padded>
          <div className="space-y-6">
            <ApplicationTypeGuide guideKey={ApplicationType.DATA_UPDATE} compact />
            <p className="text-sm text-muted-foreground">
              Për kalim te personi përgjegjës i ashensorit i ri, përdorni{" "}
              <Link href="/portal/applications/new/ownership-transfer" className="text-gov-primary hover:underline">
                Transferim pronësie
              </Link>
              .
            </p>
            <SimpleTypedApplicationForm
              type={ApplicationType.DATA_UPDATE}
              elevators={elevators.map((e) => ({ id: e.id, registryNumber: e.registryNumber, address: e.buildingAddress }))}
              label="Ashensori"
              defaultElevatorId={elevatorId}
              submitLabel="Krijo aplikimin e përditësimit"
            />
          </div>
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

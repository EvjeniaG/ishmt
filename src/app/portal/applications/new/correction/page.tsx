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

export default async function CorrectionApplicationPage({
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
    <AppShell title="Korrigjim të dhënave">
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="Korrigjim të dhënave"
        description="Për gabime regjistrimi - jo për ndryshime legjitime ose transferim pronësie"
        actions={
          <Link href="/portal/applications/new" className="text-sm text-primary hover:underline">
            ← Kthehu te llojet e aplikimeve
          </Link>
        }
      >
        <SectionCard title="Formulari i korrigjimit" padded>
          <div className="space-y-6">
            <ApplicationTypeGuide guideKey={ApplicationType.DATA_CORRECTION} compact />
            <SimpleTypedApplicationForm
              type={ApplicationType.DATA_CORRECTION}
              elevators={elevators.map((e) => ({ id: e.id, registryNumber: e.registryNumber, address: e.buildingAddress }))}
              label="Ashensori"
              defaultElevatorId={elevatorId}
              submitLabel="Krijo aplikimin e korrigjimit"
            />
          </div>
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

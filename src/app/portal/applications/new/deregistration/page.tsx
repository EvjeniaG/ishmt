import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationType } from "@prisma/client";
import { ApplicationTypeGuide } from "@/components/applications/application-type-guide";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { DeregistrationApplicationForm } from "@/components/owner/typed-application-forms";
import { ElevatorService } from "@/lib/services/elevator-service";
import { getAuthSession } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";

export default async function DeregistrationApplicationPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_CREATE)) redirect("/unauthorized");

  const elevators = await ElevatorService.listForOwner(session.user.activeOrgId, { status: "ACTIVE" });

  return (
    <AppShell title="Çregjistrim">
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="Çregjistrim ashensori"
        description="Heqja përfundimtare e ashensorit nga regjistri aktiv"
        actions={
          <Link href="/portal/applications/new" className="text-sm text-primary hover:underline">
            ← Kthehu te llojet e aplikimeve
          </Link>
        }
      >
        <SectionCard title="Formulari i çregjistrimit" padded>
          <div className="space-y-6">
            <ApplicationTypeGuide guideKey={ApplicationType.DEREGISTRATION} compact />
            <DeregistrationApplicationForm elevators={elevators.map((e) => ({ id: e.id, registryNumber: e.registryNumber, address: e.buildingAddress }))} />
          </div>
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

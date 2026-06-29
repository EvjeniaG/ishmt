import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { MaintenanceAssignmentForm } from "@/components/owner/maintenance-assignment-form";
import { SectionCard } from "@/components/shared/institutional";
import { ElevatorService } from "@/lib/services/elevator-service";
import { MaintenanceAssignmentService } from "@/lib/services/maintenance-assignment-service";
import { CertifierInspectionService } from "@/lib/services/certifier-inspection-service";
import { getAuthSession } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";

export default async function ChangeMaintenancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.MAINTENANCE_REQUEST_ASSIGNMENT)) redirect("/unauthorized");

  const elevator = await ElevatorService.getDigitalFile(id, session.user.activeOrgId);
  if (!elevator) notFound();

  const hasServiceOrg = Boolean(elevator.maintenanceOrg);
  const pageTitle = hasServiceOrg
    ? "Ndrysho kompaninë e mirëmbajtjes dhe inspektimit"
    : "Cakto kompaninë e mirëmbajtjes dhe inspektimit";

  const [companies, certifiers] = await Promise.all([
    MaintenanceAssignmentService.listMaintenanceCompaniesWithQkbStatus(),
    CertifierInspectionService.listEligibleCertifierCompanies(),
  ]);

  return (
    <AppShell title={pageTitle}>
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title={pageTitle}
        description={elevator.registryNumber}
      >
        <SectionCard title="Mirëmbajtje dhe inspektim" padded>
          <MaintenanceAssignmentForm elevatorId={id} companies={companies} certifiers={certifiers} />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

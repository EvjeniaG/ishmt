import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { DataSheet, SectionCard } from "@/components/shared/institutional";
import { ComplianceIndicatorBadge } from "@/components/shared/compliance-indicator-badge";
import { getAuthSession } from "@/lib/auth";
import { BuildingService } from "@/lib/services/building-service";
import { resolveElevatorComplianceView } from "@/lib/elevators/resolve-elevator-compliance";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isIshmtStaffRole(session.user.roleCode)) {
    redirect("/unauthorized");
  }

  const building = await BuildingService.getById(id);
  if (!building) notFound();

  return (
    <AppShell title="Ndërtesa">
      <StandardPageLayout
        eyebrow="IQMT · Ndërtesat"
        title={building.name ?? building.address}
        description={building.municipality.nameSq}
        actions={
          <Link href="/ishmt/buildings" className="text-sm text-gov-primary hover:underline">
            ← Ndërtesat
          </Link>
        }
      >
        <SectionCard title="Të dhënat e ndërtesës" subtitle="Informacioni bazë i regjistruar" padded>
          <DataSheet
            columns={2}
            items={[
              { label: "Adresa", value: building.address },
              ...(building.primaryOwnerOrg
                ? [{ label: "Personi përgjegjës kryesor i ashensorit", value: building.primaryOwnerOrg.name }]
                : []),
              ...(building.buildingType
                ? [{ label: "Tipi", value: building.buildingType }]
                : []),
              { label: "Ashensorë", value: building.elevators.length },
            ]}
          />
        </SectionCard>

        <SectionCard
          title="Ashensorët në këtë ndërtesë"
          subtitle="Lista e ashensorëve të lidhur me ndërtesën"
          meta={
            <span className="portal-badge-neutral tabular-nums">{building.elevators.length} ashensorë</span>
          }
          padded
        >
          {building.elevators.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nuk ka ashensorë të lidhur.</p>
          ) : (
            <ul className="space-y-2">
              {building.elevators.map((e) => {
                const complianceView = resolveElevatorComplianceView({
                  status: e.status,
                  maintenanceOrgId: e.maintenanceOrgId,
                  inspections: e.inspections,
                  maintenanceRecords: e.maintenanceRecords,
                  maintenanceCompliance: e.maintenanceCompliance,
                  complianceIndicator: e.complianceIndicator,
                  certificates: e.certificates,
                });
                return (
                  <li key={e.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div>
                      <Link href={`/ishmt/elevators/${e.id}`} className="font-medium text-gov-primary hover:underline">
                        {e.registryNumber}
                      </Link>
                      <p className="text-muted-foreground">{e.technicalData?.serialNumber ?? "-"}</p>
                    </div>
                    <ComplianceIndicatorBadge
                      indicator={complianceView.indicator}
                      label={complianceView.display.label}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

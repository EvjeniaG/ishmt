import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ElevatorFilters } from "@/components/owner/elevator-filters";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { getMunicipalities } from "@/lib/data/municipalities";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { MaintenanceWorkService } from "@/lib/services/maintenance-work-service";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { elevatorRowClassName } from "@/lib/utils/elevator-row-style";
import { labelElevatorStatus } from "@/lib/constants/display-labels";
import { ROLE_CODES } from "@/lib/constants/roles";
import { hasServiceCapability } from "@/lib/organizations/org-capabilities";
import { requireServiceCapabilityForPage } from "@/lib/auth/page-guards";

export default async function OwnerElevatorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    municipalityId?: string;
    missingMaintenance?: string;
    compliance?: string;
    expiringCertificate?: string;
    overdueInspection?: string;
    missingQrPlacement?: string;
  }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (hasServiceCapability(session.user, "maintenance")) {
    const ctx = await requireServiceCapabilityForPage("maintenance");
    const elevators = await MaintenanceWorkService.listAssignedElevators(ctx);
    return (
      <AppShell>
        <StandardPageLayout
          eyebrow="Portali · Mirëmbajtje"
          title="Ashensorët e Caktuar"
          description="Ashensorë me kontratë aktive mirëmbajtjeje"
        >
          <SectionCard
            title="Lista e ashensorëve"
            meta={
              <span className="portal-badge-neutral tabular-nums">{elevators.length} regjistrime</span>
            }
          >
            {elevators.length === 0 ? (
              <PortalEmptyState>Nuk ka ashensorë të caktuar.</PortalEmptyState>
            ) : (
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th>Nr. regjistrimit</th>
                    <th>Adresa</th>
                    <th>Bashkia</th>
                    <th>Kontrata</th>
                    <th>Skadon</th>
                    <th>Veprime</th>
                  </tr>
                </thead>
                <tbody>
                  {elevators.map((e) => (
                    <tr key={e.elevatorId}>
                      <td>{e.registryNumber}</td>
                      <td>{e.address}</td>
                      <td>{e.municipality}</td>
                      <td>{e.contractNumber ?? "-"}</td>
                      <td>{e.contractExpiresInDays != null ? `${e.contractExpiresInDays} ditë` : "-"}</td>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
                          <Link
                            href={`/portal/elevators/${e.elevatorId}?tab=maintenance`}
                            className="font-medium text-gov-primary hover:underline"
                          >
                            Dosja e plotë
                          </Link>
                          <Link href="/portal/sherbimi/nderhyrje" className="text-gov-primary hover:underline">
                            Ndërhyrje
                          </Link>
                          <Link href="/portal/sherbimi/raport-mujor" className="text-gov-primary hover:underline">
                            Raport
                          </Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PortalTableWrap>
            )}
          </SectionCard>
        </StandardPageLayout>
      </AppShell>
    );
  }

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.ELEVATORS_VIEW_OWN)) redirect("/unauthorized");
  if (session.user.roleCode !== ROLE_CODES.OWNER) redirect("/unauthorized");

  const params = await searchParams;
  const [elevators, municipalities] = await Promise.all([
    OwnerPortalService.listElevatorsWithFilters(session.user.activeOrgId, {
      status: params.status,
      municipalityId: params.municipalityId,
      missingMaintenance: params.missingMaintenance === "1",
      complianceIndicator: params.compliance,
      expiringCertificate: params.expiringCertificate === "1",
      overdueInspection: params.overdueInspection === "1",
      missingQrPlacement: params.missingQrPlacement === "1",
    }),
    getMunicipalities(),
  ]);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="Ashensorët & Dosjet"
        description="Regjistri i ashensorëve për të cilët jeni person përgjegjës"
      >
        <ElevatorFilters municipalities={municipalities} />

        <SectionCard
          title="Lista e ashensorëve"
          meta={
            <span className="portal-badge-neutral tabular-nums">{elevators.length} regjistrime</span>
          }
        >
          {elevators.length === 0 ? (
            <PortalEmptyState>Nuk ka ashensorë që përputhen me filtrat.</PortalEmptyState>
          ) : (
            <PortalTableWrap>
              <thead>
                <tr>
                  <th>Nr. regjistrimit</th>
                  <th>Nr. certifikatës</th>
                  <th>Marka</th>
                  <th>Modeli</th>
                  <th>Nr. serial</th>
                  <th>Adresa</th>
                  <th>Bashkia</th>
                  <th>Statusi</th>
                  <th>Përputhshmëria</th>
                  <th>Mirëmbajtësi</th>
                  <th>Inspektimi i fundit</th>
                  <th>Inspektimi i radhës</th>
                  <th>QR</th>
                  <th>Veprime</th>
                </tr>
              </thead>
              <tbody>
                {elevators.map((elv) => {
                  const cert = elv.certificates[0];
                  const lastInsp = elv.inspections[0]?.conductedDate;
                  const nextInsp = elv.inspections[0]?.nextInspectionDate;
                  const qrConfirmed = Boolean(elv.qrCodes[0]?.placementPhotoDocumentId);
                  return (
                    <tr key={elv.id} className={elevatorRowClassName(elv.status)}>
                      <td>{elv.registryNumber}</td>
                      <td>{cert?.certificateNumber ?? "-"}</td>
                      <td>{elv.technicalData?.manufacturer ?? "-"}</td>
                      <td>{elv.technicalData?.model ?? "-"}</td>
                      <td>{elv.technicalData?.serialNumber ?? "-"}</td>
                      <td>{elv.buildingAddress}</td>
                      <td>{elv.municipality.nameSq}</td>
                      <td>{labelElevatorStatus(elv.status)}</td>
                      <td>
                        <span className={`inline-block h-3 w-3 rounded-full ${elv.compliance.dotClass}`} title={elv.compliance.label} />
                      </td>
                      <td>{elv.maintenanceOrg?.name ?? "-"}</td>
                      <td>{lastInsp ? new Date(lastInsp).toLocaleDateString("sq-AL") : "Mungon"}</td>
                      <td>{nextInsp ? new Date(nextInsp).toLocaleDateString("sq-AL") : "Mungon"}</td>
                      <td>{qrConfirmed ? "✓" : "-"}</td>
                      <td className="whitespace-nowrap">
                        <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
                          <Link href={`/portal/elevators/${elv.id}`} className="text-gov-primary hover:underline">Dosja</Link>
                          <Link href={`/portal/applications/new/ownership-transfer?elevatorId=${elv.id}`} className="text-gov-primary hover:underline" title="Kalim te subjekt tjetër përgjegjës">Transferim</Link>
                          <Link href={`/portal/applications/new/update?elevatorId=${elv.id}`} className="text-gov-primary hover:underline" title="Adresë, mirëmbajtje">Përditësim</Link>
                          <Link href={`/portal/applications/new/correction?elevatorId=${elv.id}`} className="text-gov-primary hover:underline" title="Gabime regjistrimi">Korrigjim</Link>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </PortalTableWrap>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function OwnerQrCodesPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.OWNER) redirect("/unauthorized");

  const qrCodes = await OwnerPortalService.listQrCodes(session.user.activeOrgId);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="QR kodet"
        description="Inventari i kodeve QR për ashensorët tuaj"
      >
        <SectionCard
          title="Inventari i QR kodeve"
          meta={
            <span className="portal-badge-neutral tabular-nums">{qrCodes.length} regjistrime</span>
          }
        >
          {qrCodes.length === 0 ? (
            <PortalEmptyState>Nuk ka QR kode aktive.</PortalEmptyState>
          ) : (
            <PortalTableWrap>
              <thead>
                <tr>
                  <th>Kodi</th>
                  <th>Ashensori</th>
                  <th>Adresa</th>
                  <th>Bashkia</th>
                  <th>Vendosja</th>
                  <th>Veprime</th>
                </tr>
              </thead>
              <tbody>
                {qrCodes.map((qr) => (
                  <tr key={qr.id}>
                    <td className="font-mono text-xs">{qr.code}</td>
                    <td>
                      <Link href={`/portal/elevators/${qr.elevator.id}`} className="text-gov-primary hover:underline">
                        {qr.elevator.registryNumber}
                      </Link>
                    </td>
                    <td>{qr.elevator.buildingAddress}</td>
                    <td>{qr.elevator.municipality.nameSq}</td>
                    <td>
                      {qr.placementPhotoDocumentId ? (
                        <span className="text-gov-success">Konfirmuar</span>
                      ) : (
                        <span className="text-gov-warning">Mungon foto</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex gap-3">
                        <Link href={`/portal/elevators/${qr.elevator.id}/qr`} className="text-gov-primary hover:underline">
                          Menaxho
                        </Link>
                        <Link href={`/q/${qr.code}`} className="text-gov-primary hover:underline" target="_blank">
                          Pamje publike
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

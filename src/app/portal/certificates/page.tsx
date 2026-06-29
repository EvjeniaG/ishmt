import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { db } from "@/lib/db";
import { labelCertificateStatus } from "@/lib/constants/display-labels";
import { portalEyebrowForRole } from "@/lib/constants/portal-labels";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function OwnerCertificatesPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const isOwner = session.user.roleCode === ROLE_CODES.OWNER;
  const isCertifier = session.user.roleCode === ROLE_CODES.CERTIFIER;
  if (!isOwner && !isCertifier) redirect("/unauthorized");

  const certificates = isOwner
    ? await OwnerPortalService.listCertificates(session.user.activeOrgId)
    : await db.certificate.findMany({
        where: { issuedByOrgId: session.user.activeOrgId },
        include: { elevator: true },
        orderBy: { issuedDate: "desc" },
      });

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow={portalEyebrowForRole(session.user.roleCode)}
        title="Certifikatat"
        description="Certifikatat e lëshuara për ashensorët tuaj"
      >
        <SectionCard
          title="Certifikatat e ashensorëve"
          meta={
            <span className="portal-badge-neutral tabular-nums">{certificates.length} regjistrime</span>
          }
        >
          {certificates.length === 0 ? (
            <PortalEmptyState>Nuk ka certifikata të regjistruara.</PortalEmptyState>
          ) : (
            <PortalTableWrap>
              <thead>
                <tr>
                  <th>Nr. certifikatës</th>
                  <th>Ashensori</th>
                  <th>Adresa</th>
                  <th>Lëshuar</th>
                  <th>Skadon</th>
                  <th>Statusi</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id}>
                    <td>{cert.certificateNumber}</td>
                    <td>
                      <Link href={`/portal/elevators/${cert.elevator.id}?tab=inspections`} className="text-gov-primary hover:underline">
                        {cert.elevator.registryNumber}
                      </Link>
                    </td>
                    <td>{cert.elevator.buildingAddress}</td>
                    <td>{new Date(cert.issuedDate).toLocaleDateString("sq-AL")}</td>
                    <td>{cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString("sq-AL") : "-"}</td>
                    <td>{labelCertificateStatus(cert.status)}</td>
                    <td>
                      {cert.documentId && (
                        <Link href={`/api/documents/${cert.documentId}/download`} className="text-gov-primary hover:underline">
                          Shkarko PDF
                        </Link>
                      )}
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

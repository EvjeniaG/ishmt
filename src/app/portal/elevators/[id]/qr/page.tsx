import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { QrPlacementForm } from "@/components/elevators/qr-placement-form";
import { PrintButton } from "@/components/shared/print-button";
import { InstitutionalNotice, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { QrService } from "@/lib/services/qr-service";
import { loadDigitalFileForViewer } from "@/lib/elevators/digital-file-access";
import { portalEyebrowForRole } from "@/lib/constants/portal-labels";
import { ROLE_CODES } from "@/lib/constants/roles";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export default async function ElevatorQrPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const digitalFile = await loadDigitalFileForViewer(id, {
    roleCode: session.user.roleCode,
    activeOrgId: session.user.activeOrgId,
    userId: session.user.id,
  });
  if (digitalFile.status === "unauthorized") redirect("/unauthorized");
  if (digitalFile.status === "not_found") notFound();

  const ownerScopeOrgId =
    session.user.roleCode === ROLE_CODES.OWNER ? session.user.activeOrgId : null;
  const data = await QrService.getPrintableData(id, ownerScopeOrgId, session.user.id);
  const qrImageDataUrl = data?.qrCode ? await QrService.generateQrImageDataUrl(data.qrCode) : null;

  if (!data) notFound();

  const eyebrow = portalEyebrowForRole(session.user.roleCode) ?? "Portali";

  return (
    <AppShell title={data.qrCode ? "QR - Printim" : "QR - Në Pritje Gjenerimi"}>
      <div className="print:space-y-4">
        {!data.qrCode ? (
          <StandardPageLayout
            eyebrow={eyebrow}
            title={`Kodi QR - ${data.registryNumber}`}
            description="Gjenerim në pritje"
            actions={
              <Link href="/portal/elevators" className="text-sm text-primary hover:underline">
                ← Kthehu te ashensorët
              </Link>
            }
          >
            <InstitutionalNotice variant="warning" title="Kodi QR nuk është gjeneruar ende">
              <p>
                Kodi QR gjenerohet automatikisht pas miratimit të aplikimit të regjistrim.
                Në këtë moment, ashensori {data.registryNumber} nuk ka një kod QR aktiv.
              </p>
              <p className="mt-2 text-sm">
                <strong>Arsyet e mundshme:</strong>
              </p>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
                <li>Aplikimi nuk është miratuar ende</li>
                <li>Ka një problem në procesin e gjenerimit (kontaktoni ISHMT)</li>
                <li>Ashensori nuk ka një sertifikatë aktive regjistrimi</li>
              </ul>
              <p className="mt-2 text-sm">
                <strong>Zgjidhja:</strong> Kontaktoni ISHMT nëse kjo situatë vazhdon.
              </p>
            </InstitutionalNotice>
          </StandardPageLayout>
        ) : (
          <StandardPageLayout
            eyebrow={eyebrow}
            title={`Kodi QR - ${data.registryNumber}`}
            description="Printoni dhe vendosni në ashensor"
            actions={
              <div className="print:hidden">
                <PrintButton />
              </div>
            }
          >
            <SectionCard
              title="ISHMT - Regjistri Digjital i Ashensorëve"
              className="print:border-0 print:shadow-none"
              padded
            >
              <div className="flex flex-col items-center gap-4 text-center">
                {qrImageDataUrl ? (
                  <img
                    src={qrImageDataUrl}
                    alt={`QR ${data.registryNumber}`}
                    width={280}
                    height={280}
                    loading="eager"
                    decoding="sync"
                    data-print-qr="true"
                    className="rounded border print:rounded-none print:border print:border-black"
                  />
                ) : null}
                <div className="text-sm">
                  <p className="text-xl font-bold">{data.registryNumber}</p>
                  <p>{data.buildingAddress}</p>
                  <p>{data.municipality}</p>
                  {data.certificateNumber && (
                    <p className="mt-2">Certifikata: {data.certificateNumber}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Skanimi hap faqen publike:{" "}
                    <span className="hidden print:inline">{data.publicUrl}</span>
                    <Link
                      href={`/q/${data.qrCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-primary hover:underline print:hidden"
                    >
                      {data.publicUrl}
                    </Link>
                  </p>
                </div>
              </div>
            </SectionCard>

            <p className="print:hidden text-sm">
              <Link
                href={`/q/${data.qrCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Shiko faqen publike për qytetarët →
              </Link>
            </p>

            {data.certificateDocumentId && (
              <SectionCard title="Certifikata" className="print:hidden" padded>
                <a
                  href={`/api/documents/${data.certificateDocumentId}/download`}
                  className="text-sm text-primary hover:underline"
                >
                  Shkarko certifikatën PDF (CR)
                </a>
              </SectionCard>
            )}

            {data.qrCodeId && !isIshmtStaffRole(session.user.roleCode) && (
              <div className="print:hidden">
                <QrPlacementForm
                  qrCodeId={data.qrCodeId}
                  elevatorId={id}
                  hasPlacementPhoto={data.hasPlacementPhoto}
                />
              </div>
            )}

            <p className="print:hidden text-sm">
              <Link href={`/portal/elevators/${id}?tab=qr`} className="text-primary hover:underline">
                ← Kthehu te dosja e ashensorit
              </Link>
            </p>
          </StandardPageLayout>
        )}
      </div>
    </AppShell>
  );
}

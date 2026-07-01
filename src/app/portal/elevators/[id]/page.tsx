import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MinorContactForm } from "@/components/lifecycle/minor-contact-form";
import { MaintenanceAssignmentForm } from "@/components/owner/maintenance-assignment-form";
import { PhysicalVerificationButton } from "@/components/elevators/physical-verification-button";
import { ComplianceIndicator } from "@prisma/client";
import { ComplianceService } from "@/lib/services/compliance-service";
import { resolveElevatorComplianceView } from "@/lib/elevators/resolve-elevator-compliance";
import { DocumentService } from "@/lib/services/document-service";
import { ElevatorDossierHealthService, type DossierHealthLevel } from "@/lib/services/elevator-dossier-health-service";
import { MaintenanceAssignmentService } from "@/lib/services/maintenance-assignment-service";
import { CertifierInspectionService } from "@/lib/services/certifier-inspection-service";
import { getAuthSession } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { ROLE_CODES } from "@/lib/constants/roles";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import { labelApplicationType } from "@/lib/constants/display-labels";
import { ElevatorDeadlinesCard } from "@/components/deadlines/elevator-deadlines-card";
import { DeadlineService } from "@/lib/deadlines/deadline-service";
import { getInspectionIntervalMonths } from "@/lib/deadlines/inspection-interval";
import { QrImage } from "@/components/elevators/qr-image";
import { QrPlacementForm } from "@/components/elevators/qr-placement-form";
import { QrService } from "@/lib/services/qr-service";
import { ElevatorTabPanel } from "@/components/elevators/elevator-tab-panel";
import {
  buildInspectionRegistryView,
  buildMaintenanceRegistryView,
} from "@/lib/elevators/registry-view-models";
import { MaintenanceRegistryPanel } from "@/components/elevators/maintenance-registry-panel";
import { InspectionRegistryPanel } from "@/components/elevators/inspection-registry-panel";
import { ElevatorDossierTabs, type ElevatorDossierTabId } from "@/components/elevators/elevator-dossier-tabs";
import { buildElevatorTabDossier } from "@/lib/elevators/build-tab-dossier";
import { loadDigitalFileForViewer } from "@/lib/elevators/digital-file-access";
import {
  defaultDossierTab,
  dossierTabsForViewer,
  resolveDossierViewerKind,
} from "@/lib/elevators/dossier-viewer";
import { CertifierDossierActions } from "@/components/elevators/certifier-dossier-actions";
import { MaintenanceDossierActions } from "@/components/elevators/maintenance-dossier-actions";

function hasOpenServiceContract(
  contracts: Array<{ serviceType: string; status: string }>,
  serviceType: "MAINTENANCE" | "PERIODIC_INSPECTION",
) {
  return contracts.some(
    (c) => c.serviceType === serviceType && (c.status === "ACTIVE" || c.status === "PENDING"),
  );
}

function serviceAssignmentTitle(needsMaintenance: boolean, needsInspection: boolean) {
  if (needsMaintenance && needsInspection) {
    return "Cakto kompaninë e mirëmbajtjes dhe inspektimit";
  }
  if (needsMaintenance) return "Cakto kompaninë e mirëmbajtjes";
  return "Cakto kompaninë e inspektimit";
}

function healthTone(level: DossierHealthLevel) {
  switch (level) {
    case "ok":
      return "border-green-200 bg-green-50 text-green-800";
    case "warning":
      return "border-yellow-200 bg-yellow-50 text-yellow-800";
    case "blocker":
      return "border-red-200 bg-red-50 text-red-800";
  }
}

export default async function ElevatorDigitalFilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const viewerKind = resolveDossierViewerKind(session.user.roleCode);
  const allowedTabs = dossierTabsForViewer(viewerKind);
  const tabDefault = defaultDossierTab(viewerKind);
  const requestedTab = (tab ?? tabDefault) as ElevatorDossierTabId;
  if (!allowedTabs.includes(requestedTab)) {
    redirect(`/portal/elevators/${id}?tab=${tabDefault}`);
  }
  const activeTab = requestedTab;

  const digitalFile = await loadDigitalFileForViewer(id, {
    roleCode: session.user.roleCode,
    activeOrgId: session.user.activeOrgId,
    userId: session.user.id,
  });
  if (digitalFile.status === "unauthorized") redirect("/unauthorized");
  if (digitalFile.status === "not_found") notFound();
  const elevator = digitalFile.elevator;

  const complianceView = resolveElevatorComplianceView({
    status: elevator.status,
    maintenanceOrgId: elevator.maintenanceOrgId,
    inspections: elevator.inspections,
    maintenanceRecords: elevator.maintenanceRecords,
    maintenanceCompliance: elevator.maintenanceCompliance,
    complianceIndicator: elevator.complianceIndicator,
    certificates: elevator.certificates,
  });
  const display = ComplianceService.getPublicDisplay(complianceView.indicator);
  const needsAttention = complianceView.indicator !== ComplianceIndicator.GREEN;
  const dossierHealth = ElevatorDossierHealthService.resolve({
    elevatorId: id,
    status: elevator.status,
    certificates: elevator.certificates,
    qrCodes: elevator.qrCodes,
    maintenanceContracts: elevator.maintenanceContracts,
    inspections: elevator.inspections,
    maintenanceOrgId: elevator.maintenanceOrgId,
    lastMaintenanceDate:
      elevator.maintenanceCompliance?.lastMaintenanceDate ??
      elevator.maintenanceRecords[0]?.performedDate ??
      null,
    complianceIndicator: elevator.complianceIndicator,
  });
  const regCert = elevator.certificates.find((c) => c.type === "REGISTRATION" && c.status === "ACTIVE");
  const qr = elevator.qrCodes[0];
  const documents =
    tab === "documents"
      ? Array.from(
          new Map(
            (
              await Promise.all([
                DocumentService.listForEntity("elevator", id),
                elevator.originatingApplication
                  ? DocumentService.listForEntity("application", elevator.originatingApplication.id)
                  : Promise.resolve([]),
              ])
            )
              .flat()
              .map((doc) => [doc.id, doc] as const),
          ).values(),
        ).map((doc) => DocumentService.serializeDocument(doc))
      : [];

  const canManageMaintenance =
    session.user.roleCode === ROLE_CODES.OWNER &&
    roleHasPermission(session.user.roleCode, PERMISSIONS.MAINTENANCE_REQUEST_ASSIGNMENT);
  const needsMaintenanceAssignment = !hasOpenServiceContract(elevator.maintenanceContracts, "MAINTENANCE");
  const needsInspectionAssignment = !hasOpenServiceContract(
    elevator.maintenanceContracts,
    "PERIODIC_INSPECTION",
  );
  const showServiceAssignmentOnInspectionsTab =
    needsMaintenanceAssignment || needsInspectionAssignment;
  const [maintenanceCompanies, maintenanceCertifiers] =
    (tab === "maintenance" || (tab === "inspections" && showServiceAssignmentOnInspectionsTab)) &&
    canManageMaintenance
      ? await Promise.all([
          MaintenanceAssignmentService.listMaintenanceCompaniesWithQkbStatus(),
          CertifierInspectionService.listEligibleCertifierCompanies(),
        ])
      : [[], []];

  const appData = elevator.originatingApplication?.data;
  const nextInspection = elevator.inspections[0]?.nextInspectionDate;
  const canVerifyPhysical =
    elevator.requiresAttention &&
    roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_REVIEW);

  const periodicInspection =
    elevator.inspections.find((i) => i.type === "PERIODIC") ?? elevator.inspections[0];
  const activeMaintContract = elevator.maintenanceContracts.find((c) => c.isActive);

  const isStaffViewer = isIshmtStaffRole(session.user.roleCode);
  const isOwnerViewer = session.user.roleCode === ROLE_CODES.OWNER;
  const isIshmtViewer = viewerKind === "ishmt_staff";
  const isCertifierViewer = viewerKind === "certifier";
  const isMaintenanceViewer = viewerKind === "maintenance";

  const elevatorDeadlines = isOwnerViewer
    ? await DeadlineService.buildElevatorDeadlines({
        elevatorId: id,
        registryNumber: elevator.registryNumber,
        buildingType: appData?.buildingType ?? null,
        registrationDate: elevator.registrationDate,
        maintenanceOrgId: elevator.maintenanceOrgId,
        lastPeriodicInspection: periodicInspection
          ? {
              conductedDate: periodicInspection.conductedDate,
              nextInspectionDate: periodicInspection.nextInspectionDate,
            }
          : null,
        activeMaintenanceContract: activeMaintContract?.endDate
          ? { endDate: activeMaintContract.endDate }
          : null,
        activeRegistrationCertExpiry: regCert?.expiryDate ?? null,
      })
    : [];

  const inspectionIntervalLabel = DeadlineService.getInspectionIntervalLabel(appData?.buildingType ?? null);

  const orgId = session.user.activeOrgId;

  const certifierPendingContract =
    isCertifierViewer && orgId
      ? (elevator.maintenanceContracts.find(
          (c) =>
            c.serviceType === "PERIODIC_INSPECTION" &&
            c.status === "PENDING" &&
            c.maintenanceOrgId === orgId,
        ) ?? null)
      : null;

  const maintenancePendingContract =
    (isMaintenanceViewer || isCertifierViewer) && orgId
      ? (elevator.maintenanceContracts.find(
          (c) =>
            c.serviceType === "MAINTENANCE" &&
            c.status === "PENDING" &&
            c.maintenanceOrgId === orgId,
        ) ?? null)
      : null;

  const hasActiveMaintenanceContract =
    Boolean(orgId) &&
    elevator.maintenanceContracts.some(
      (c) =>
        c.serviceType === "MAINTENANCE" &&
        c.isActive &&
        c.maintenanceOrgId === orgId,
    );
  const qrFallbackImage =
    qr?.code && !qr.imageDocumentId ? await QrService.generateQrImageDataUrl(qr.code) : null;
  const qrPublicUrl = qr?.code ? QrService.buildPublicUrl(qr.code) : null;

  const tabDossier = buildElevatorTabDossier({
    elevator,
    complianceLabel: display.label,
    needsAttention,
    regCertNumber: regCert?.certificateNumber ?? null,
    regCertExpiry: regCert?.expiryDate ?? null,
    nextInspection: nextInspection ?? null,
    inspectionIntervalLabel,
    qrPublicUrl,
  });

  const maintenanceRegistry = buildMaintenanceRegistryView({
    maintenanceOrg: elevator.maintenanceOrg,
    maintenanceContracts: elevator.maintenanceContracts,
    maintenanceRecords: elevator.maintenanceRecords,
    maintenanceCompliance: elevator.maintenanceCompliance,
  });

  const inspectionRegistry = buildInspectionRegistryView({
    inspections: elevator.inspections,
    maintenanceContracts: elevator.maintenanceContracts,
    certifierOrg: elevator.certifierOrg,
    intervalMonths: getInspectionIntervalMonths(appData?.buildingType ?? null),
  });

  return (
    <AppShell title={`Dosja - ${elevator.registryNumber}`}>
      <div className="space-y-5 sm:space-y-6">
        {canVerifyPhysical && <PhysicalVerificationButton elevatorId={id} />}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{elevator.registryNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {elevator.buildingAddress} · {elevator.municipality.nameSq}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm shadow-sm">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${display.dotClass}`} />
            {display.label}
          </div>
        </div>

        <ElevatorDossierTabs elevatorId={id} activeTab={activeTab} tabs={allowedTabs} />

        {activeTab === "summary" && (isOwnerViewer || isStaffViewer) && (
          <>
            <ElevatorTabPanel groups={tabDossier.summary} />
            {isOwnerViewer && <ElevatorDeadlinesCard items={elevatorDeadlines} />}
            {isOwnerViewer && (
            <Card>
              <CardHeader>
                <CardTitle>Gjendja e dosjes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {dossierHealth.label}
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {dossierHealth.items.map((item) => (
                  <div key={item.key} className={`rounded-md border p-3 text-sm ${healthTone(item.level)}`}>
                    <p className="font-medium">{item.label}</p>
                    <p className="mt-1 text-xs">{item.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            )}
            {elevator.status === "ACTIVE" && session.user.roleCode === ROLE_CODES.OWNER && (
              <Card>
                <CardHeader>
                  <CardTitle>Aplikime për këtë ashensor</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  <Link
                    href={`/portal/applications/new/ownership-transfer?elevatorId=${id}`}
                    className="rounded-md border p-3 hover:border-gov-primary hover:bg-gov-primary/5"
                  >
                    <p className="font-medium text-gov-primary">Transferim pronësie</p>
                    <p className="mt-1 text-muted-foreground">Kaloni kartelën te subjekt tjetër (NIPT) - marrësi pranon, pastaj ISHMT</p>
                  </Link>
                  <Link
                    href={`/portal/applications/new/update?elevatorId=${id}`}
                    className="rounded-md border p-3 hover:border-gov-primary hover:bg-gov-primary/5"
                  >
                    <p className="font-medium text-gov-primary">Përditësim të dhënave</p>
                    <p className="mt-1 text-muted-foreground">Adresë, mirëmbajtje - pronësia mbetet e njëjta</p>
                  </Link>
                  <Link
                    href={`/portal/applications/new/correction?elevatorId=${id}`}
                    className="rounded-md border p-3 hover:border-gov-primary hover:bg-gov-primary/5"
                  >
                    <p className="font-medium text-gov-primary">Korrigjim të dhënave</p>
                    <p className="mt-1 text-muted-foreground">Gabime regjistrimi (serial, prodhues, etj.)</p>
                  </Link>
                  <Link
                    href={`/portal/elevators/${id}/maintenance/change`}
                    className="rounded-md border p-3 hover:border-gov-primary hover:bg-gov-primary/5"
                  >
                    <p className="font-medium text-gov-primary">Ndrysho kompaninë e mirëmbajtjes dhe inspektimit</p>
                  </Link>
                </CardContent>
              </Card>
            )}
            {elevator.status === "ACTIVE" && isOwnerViewer && (
              <Card>
                <CardHeader><CardTitle>Ndryshim dytësor - kontakt</CardTitle></CardHeader>
                <CardContent>
                  <MinorContactForm
                    elevatorId={id}
                    defaults={{
                      phone: elevator.ownerOrg.phone,
                      email: elevator.ownerOrg.email,
                      address: elevator.ownerOrg.address,
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {activeTab === "technical" && <ElevatorTabPanel groups={tabDossier.technical} />}

        {activeTab === "certificate" && (
          <div className="space-y-6">
            <ElevatorTabPanel groups={tabDossier.certificate} />
            {elevator.certificates.some((c) => c.documentId) && (
              <Card>
                <CardHeader><CardTitle>Shkarkime</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {elevator.certificates
                    .filter((cert) => cert.documentId)
                    .map((cert) => (
                      <p key={cert.id}>
                        <Link href={`/api/documents/${cert.documentId}/download`} className="text-primary hover:underline">
                          Shkarko {cert.certificateNumber}
                        </Link>
                      </p>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "qr" && (
          <div className="space-y-6">
            {qr?.code && (
              <Card>
                <CardHeader><CardTitle>Imazhi QR</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="text-muted-foreground">
                    Skanimi i kodit QR (me telefon) hap faqen publike për qytetarët - pa login, me statusin,
                    inspektimet dhe të dhënat e lejuara nga ligji.
                  </p>
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    <Link
                      href={`/q/${qr.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Hap faqen publike për qytetarët"
                      className="rounded border transition-opacity hover:opacity-90"
                    >
                      <QrImage
                        initialSrc={`/api/qr/${qr.code}/image`}
                        fallbackSrc={qrFallbackImage}
                        alt={`QR ${elevator.registryNumber}`}
                        width={200}
                        height={200}
                        className="rounded border"
                      />
                    </Link>
                    <div className="space-y-2">
                      <Link
                        href={`/q/${qr.code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block font-medium text-primary hover:underline"
                      >
                        Shiko faqen publike për qytetarët →
                      </Link>
                      {qrPublicUrl && (
                        <p className="break-all text-xs text-muted-foreground">{qrPublicUrl}</p>
                      )}
                      <Link href={`/portal/elevators/${id}/qr`} className="block text-primary hover:underline">
                        Hap pamjen e printimit →
                      </Link>
                      {!qr.placementPhotoDocumentId && isOwnerViewer && (
                        <p className="text-sm font-medium text-amber-800">
                          Ngarkoni fotografinë e vendosjes së QR në seksionin më poshtë.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <ElevatorTabPanel groups={tabDossier.qr} />
            {qr?.code && isOwnerViewer && (
              <QrPlacementForm
                qrCodeId={qr.id}
                elevatorId={id}
                registryNumber={elevator.registryNumber}
                hasPlacementPhoto={Boolean(qr.placementPhotoDocumentId)}
                placementPhotoDocumentId={qr.placementPhotoDocumentId}
              />
            )}
            {qr?.placementPhotoDocumentId && !isOwnerViewer && (
              <Card>
                <CardHeader>
                  <CardTitle>Foto vendosjeje QR</CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={`/api/documents/${qr.placementPhotoDocumentId}/download`}
                    className="text-sm font-medium text-gov-primary hover:underline"
                  >
                    Shiko / shkarko fotografinë e vendosjes →
                  </a>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "maintenance" && (
          <div className="space-y-6">
            {(isMaintenanceViewer || isCertifierViewer) && (
              <MaintenanceDossierActions
                elevatorId={id}
                registryNumber={elevator.registryNumber}
                pendingContract={maintenancePendingContract}
                showServiceLinks={isMaintenanceViewer}
                showInterventionForm={isMaintenanceViewer || isCertifierViewer}
                showMonthlyReportForm={isMaintenanceViewer || isCertifierViewer}
                hasActiveMaintenanceContract={hasActiveMaintenanceContract}
              />
            )}
            <MaintenanceRegistryPanel
              data={maintenanceRegistry}
              audience={
                isMaintenanceViewer || isCertifierViewer
                  ? "maintenance"
                  : isIshmtViewer
                    ? "ishmt_staff"
                    : "owner"
              }
            />
            {isOwnerViewer &&
              (canManageMaintenance ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {elevator.maintenanceOrg
                      ? "Ndrysho kompaninë e mirëmbajtjes dhe inspektimit"
                      : "Cakto kompaninë e mirëmbajtjes dhe inspektimit"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MaintenanceAssignmentForm
                    elevatorId={id}
                    companies={maintenanceCompanies}
                    certifiers={maintenanceCertifiers}
                  />
                </CardContent>
              </Card>
            ) : (
              <Link href={`/portal/elevators/${id}/maintenance/change`} className="text-primary hover:underline">
                Cakto / ndrysho kompaninë e mirëmbajtjes dhe inspektimit
              </Link>
            ))}
          </div>
        )}

        {activeTab === "inspections" && (
          <div className="space-y-6">
            {isCertifierViewer && (
              <CertifierDossierActions
                elevatorId={id}
                registryNumber={elevator.registryNumber}
                pendingContract={certifierPendingContract}
              />
            )}
            <InspectionRegistryPanel
              data={inspectionRegistry}
              audience={
                isCertifierViewer ? "certifier" : isIshmtViewer ? "ishmt_staff" : "owner"
              }
              elevatorId={id}
            />
            {isOwnerViewer &&
              showServiceAssignmentOnInspectionsTab &&
              (canManageMaintenance ? (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {serviceAssignmentTitle(needsMaintenanceAssignment, needsInspectionAssignment)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MaintenanceAssignmentForm
                      elevatorId={id}
                      companies={maintenanceCompanies}
                      certifiers={maintenanceCertifiers}
                      scope={{
                        needsMaintenance: needsMaintenanceAssignment,
                        needsInspection: needsInspectionAssignment,
                      }}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Link href={`/portal/elevators/${id}/maintenance/change`} className="text-primary hover:underline">
                  Cakto / ndrysho kompaninë e mirëmbajtjes dhe inspektimit
                </Link>
              ))}
          </div>
        )}

        {activeTab === "history" && (isOwnerViewer || isStaffViewer) && <ElevatorTabPanel groups={tabDossier.history} />}

        {activeTab === "applications" && (isOwnerViewer || isStaffViewer) && (
          <div className="space-y-6">
            <ElevatorTabPanel groups={tabDossier.applications} />
            <Card>
              <CardHeader><CardTitle>Hap aplikimet</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {elevator.originatingApplication && (
                  <p>
                    <Link href={`/portal/applications/${elevator.originatingApplication.id}`} className="text-primary hover:underline">
                      {elevator.originatingApplication.applicationNumber}
                    </Link>{" "}
                    - Regjistrim fillestar
                  </p>
                )}
                {elevator.targetApplications.map((app) => (
                  <p key={app.id}>
                    <Link href={`/portal/applications/${app.id}`} className="text-primary hover:underline">
                      {app.applicationNumber}
                    </Link>{" "}
                    - {labelApplicationType(app.type, app.data?.updateType)}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "documents" && (
          <Card>
            <CardHeader><CardTitle>Dokumente</CardTitle></CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nuk ka dokumente të lidhura me këtë ashensor.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2">Dokumenti</th>
                        <th>Lloji</th>
                        <th>Ngarkuar nga</th>
                        <th>Data</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} className="border-b">
                          <td className="py-2">{doc.originalFilename}</td>
                          <td>{doc.classification}</td>
                          <td>{doc.uploadedBy ?? "-"}</td>
                          <td>{new Date(doc.uploadedAt).toLocaleDateString("sq-AL")}</td>
                          <td>
                            <Link href={`/api/documents/${doc.id}/download`} className="text-gov-primary hover:underline">
                              Shkarko
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

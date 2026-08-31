import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ElevatorLifecycleApplicationsPanel } from "@/components/elevators/elevator-lifecycle-applications-panel";
import { MaintenanceAssignmentForm } from "@/components/owner/maintenance-assignment-form";
import { PhysicalVerificationButton } from "@/components/elevators/physical-verification-button";
import { ComplianceIndicator } from "@prisma/client";
import { ComplianceService } from "@/lib/services/compliance-service";
import { resolveElevatorComplianceView } from "@/lib/elevators/resolve-elevator-compliance";
import { DocumentService } from "@/lib/services/document-service";
import { MaintenanceAssignmentService } from "@/lib/services/maintenance-assignment-service";
import { CertifierInspectionService } from "@/lib/services/certifier-inspection-service";
import { buildTechnicianDisplayName } from "@/lib/forms/system-form-prefill";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { ROLE_CODES } from "@/lib/constants/roles";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import { getAuthSession } from "@/lib/auth";
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
import { isPeriodicInspectionLogWindowOpen } from "@/lib/elevators/periodic-inspection-window";
import { MaintenanceContractService } from "@/lib/services/maintenance-contract-service";
import { MaintenanceRegistryPanel } from "@/components/elevators/maintenance-registry-panel";
import { InspectionRegistryPanel } from "@/components/elevators/inspection-registry-panel";
import { ElevatorDossierTabs, type ElevatorDossierTabId } from "@/components/elevators/elevator-dossier-tabs";
import {
  buildElevatorApplicationsList,
  buildElevatorTabDossier,
} from "@/lib/elevators/build-tab-dossier";
import { ElevatorApplicationsPanel } from "@/components/elevators/elevator-applications-panel";
import { loadDigitalFileForViewer } from "@/lib/elevators/digital-file-access";
import { defaultDossierTab, dossierTabsForViewer } from "@/lib/elevators/dossier-viewer";
import { CertifierDossierActions } from "@/components/elevators/certifier-dossier-actions";
import { MaintenanceDossierActions } from "@/components/elevators/maintenance-dossier-actions";
import { OwnerPendingServiceContracts } from "@/components/elevators/owner-pending-service-contracts";
import { ElevatorDocumentsPanel } from "@/components/elevators/elevator-documents-panel";
import { ElevatorDossierTimeline } from "@/components/elevators/elevator-dossier-timeline";
import { PeriodicControlAssignmentForm } from "@/components/owner/periodic-control-assignment-form";
import { buildPeriodicControlSchedule } from "@/lib/elevators/periodic-control-schedule";
import { certifierCanManageMaintenanceOnElevator } from "@/lib/certifier/certifier-maintenance-access";
import { filterRegistrationDossierDocuments } from "@/lib/documents/registration-dossier-documents";
import { ElevatorTimelineService } from "@/lib/services/elevator-timeline-service";

function hasOpenServiceContract(
  contracts: Array<{ serviceType: string; status: string }>,
  serviceType: "MAINTENANCE" | "PERIODIC_INSPECTION",
) {
  return contracts.some(
    (c) => c.serviceType === serviceType && (c.status === "ACTIVE" || c.status === "PENDING"),
  );
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

  const digitalFile = await loadDigitalFileForViewer(id, {
    roleCode: session.user.roleCode,
    activeOrgId: session.user.activeOrgId,
    userId: session.user.id,
    permissions: session.user.permissions ?? [],
    orgCapabilities: session.user.orgCapabilities,
  });
  if (digitalFile.status === "unauthorized") redirect("/unauthorized");
  if (digitalFile.status === "not_found") notFound();

  const viewerKind = digitalFile.viewerKind;
  const allowedTabs = dossierTabsForViewer(viewerKind);
  const tabDefault = defaultDossierTab(viewerKind);
  const requestedTab = (tab ?? tabDefault) as ElevatorDossierTabId;
  if (!allowedTabs.includes(requestedTab)) {
    redirect(`/portal/elevators/${id}?tab=${tabDefault}`);
  }
  const activeTab = requestedTab;
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
  const regCert = elevator.certificates.find((c) => c.type === "REGISTRATION" && c.status === "ACTIVE");
  const qr = elevator.qrCodes[0];
  const documents =
    tab === "documents"
      ? Array.from(
          new Map(
            (
              await Promise.all([
                DocumentService.listLinkedForEntity("elevator", id),
                elevator.originatingApplication
                  ? DocumentService.listLinkedForEntity("application", elevator.originatingApplication.id)
                  : Promise.resolve([]),
              ])
            )
              .flat()
              .map((doc) => [doc.id, doc] as const),
          ).values(),
        ).sort(
          (left, right) =>
            new Date(String(right.uploadedAt)).getTime() - new Date(String(left.uploadedAt)).getTime(),
        )
      : [];
  const registrationDocuments = filterRegistrationDossierDocuments(documents);

  const canManageMaintenance =
    session.user.roleCode === ROLE_CODES.OWNER &&
    roleHasPermission(session.user.roleCode, PERMISSIONS.MAINTENANCE_REQUEST_ASSIGNMENT);
  const isOwnerViewer = session.user.roleCode === ROLE_CODES.OWNER;
  const needsMaintenanceAssignment = !hasOpenServiceContract(elevator.maintenanceContracts, "MAINTENANCE");
  const needsInspectionAssignment = !hasOpenServiceContract(
    elevator.maintenanceContracts,
    "PERIODIC_INSPECTION",
  );
  const ownerPendingMaintenanceContracts = isOwnerViewer
    ? elevator.maintenanceContracts.filter(
        (contract) => contract.status === "PENDING" && contract.serviceType === "MAINTENANCE",
      )
    : [];
  const hasActiveMaintenanceContract = elevator.maintenanceContracts.some(
    (contract) => contract.serviceType === "MAINTENANCE" && contract.status === "ACTIVE",
  );
  const canChangeMaintenanceCompany =
    canManageMaintenance &&
    !needsMaintenanceAssignment &&
    ownerPendingMaintenanceContracts.length === 0 &&
    hasActiveMaintenanceContract;
  const showMaintenanceAssignmentOnTab =
    tab === "maintenance" && (needsMaintenanceAssignment || canChangeMaintenanceCompany);
  const ownerPendingInspectionContracts = isOwnerViewer
    ? elevator.maintenanceContracts.filter(
        (contract) => contract.status === "PENDING" && contract.serviceType === "PERIODIC_INSPECTION",
      )
    : [];
  const hasActiveInspectionContract = elevator.maintenanceContracts.some(
    (contract) => contract.serviceType === "PERIODIC_INSPECTION" && contract.status === "ACTIVE",
  );
  const canChangeInspectionCompany =
    canManageMaintenance &&
    !needsInspectionAssignment &&
    ownerPendingInspectionContracts.length === 0 &&
    hasActiveInspectionContract;
  const showInspectionAssignmentOnInspectionsTab =
    tab === "inspections" && (needsInspectionAssignment || canChangeInspectionCompany);
  const [maintenanceCompanies, maintenanceCertifiers] =
    (showMaintenanceAssignmentOnTab && canManageMaintenance) ||
    (showInspectionAssignmentOnInspectionsTab && canManageMaintenance)
      ? await Promise.all([
          showMaintenanceAssignmentOnTab
            ? MaintenanceAssignmentService.listMaintenanceCompaniesWithQkbStatus()
            : Promise.resolve([]),
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
  const activeMaintContract = elevator.maintenanceContracts.find(
    (c) => c.isActive && c.serviceType === "MAINTENANCE",
  );
  const activeInspectionContract = elevator.maintenanceContracts.find(
    (c) => c.isActive && c.serviceType === "PERIODIC_INSPECTION",
  );

  const isStaffViewer = isIshmtStaffRole(session.user.roleCode);
  const isIshmtViewer = viewerKind === "ishmt_staff";
  const isCertifierViewer = viewerKind === "certifier";
  const isMaintenanceViewer = viewerKind === "maintenance";
  const isInstallerViewer = viewerKind === "installer";

  const elevatorDeadlines = isOwnerViewer
    ? await DeadlineService.buildElevatorDeadlines({
        elevatorId: id,
        registryNumber: elevator.registryNumber,
        buildingType: appData?.buildingType ?? null,
        registrationDate: elevator.registrationDate,
        maintenanceOrgId: elevator.maintenanceOrgId,
        maintenanceContracts: elevator.maintenanceContracts.map((contract) => ({
          serviceType: contract.serviceType,
          status: contract.status,
          endDate: contract.endDate,
        })),
        qrCode: qr?.code
          ? { code: qr.code, placementPhotoDocumentId: qr.placementPhotoDocumentId }
          : null,
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

  const certifierManagesMaintenance =
    isCertifierViewer &&
    Boolean(orgId) &&
    certifierCanManageMaintenanceOnElevator({
      orgId,
      maintenanceContracts: elevator.maintenanceContracts,
    });

  const effectiveTabs =
    isCertifierViewer && !certifierManagesMaintenance
      ? allowedTabs.filter((tabId) => tabId !== "maintenance")
      : allowedTabs;

  if (!effectiveTabs.includes(activeTab)) {
    redirect(`/portal/elevators/${id}?tab=${defaultDossierTab(viewerKind)}`);
  }

  const certifierActiveInspectionContract =
    isCertifierViewer && orgId
      ? elevator.maintenanceContracts.find(
          (c) =>
            c.serviceType === "PERIODIC_INSPECTION" &&
            c.isActive &&
            c.status === "ACTIVE" &&
            c.maintenanceOrgId === orgId,
        )
      : null;

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
    (isMaintenanceViewer || certifierManagesMaintenance) && orgId
      ? (elevator.maintenanceContracts.find(
          (c) =>
            c.serviceType === "MAINTENANCE" &&
            c.status === "PENDING" &&
            c.maintenanceOrgId === orgId,
        ) ?? null)
      : null;

  const viewerHasActiveMaintenanceContract =
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
    compactSummary: isOwnerViewer,
  });

  const elevatorApplications = buildElevatorApplicationsList(elevator);

  const contractIds = elevator.maintenanceContracts.map((c) => c.id);
  const contractTerminationMeta =
    await MaintenanceContractService.loadTerminationMeta(contractIds);

  const maintenanceRegistry = buildMaintenanceRegistryView({
    maintenanceOrg: elevator.maintenanceOrg,
    maintenanceContracts: elevator.maintenanceContracts,
    maintenanceRecords: elevator.maintenanceRecords,
    maintenanceCompliance: elevator.maintenanceCompliance,
    terminationMeta: contractTerminationMeta,
  });

  const dossierTimeline =
    activeTab === "history" && (isOwnerViewer || isStaffViewer || isInstallerViewer)
      ? await ElevatorTimelineService.buildTimeline(id)
      : [];

  const inspectionRegistry = buildInspectionRegistryView({
    inspections: elevator.inspections,
    maintenanceContracts: elevator.maintenanceContracts,
    certifierOrg: elevator.certifierOrg,
    intervalMonths: getInspectionIntervalMonths(appData?.buildingType ?? null),
    registrationDate: elevator.registrationDate,
    buildingType: appData?.buildingType ?? null,
    terminationMeta: contractTerminationMeta,
  });

  const latestPeriodicInspection = inspectionRegistry.items[0] ?? null;
  const periodicInspectionWindow = isPeriodicInspectionLogWindowOpen({
    lastInspection: latestPeriodicInspection
      ? {
          conductedDate: latestPeriodicInspection.conductedDate,
          result: latestPeriodicInspection.result,
          nextInspectionDate: inspectionRegistry.nextDue,
        }
      : null,
    registrationDate: elevator.registrationDate,
    intervalMonths: inspectionRegistry.intervalMonths,
  });

  const canLogPeriodicInspection =
    Boolean(certifierActiveInspectionContract) && periodicInspectionWindow.open;

  const periodicControlSchedule = buildPeriodicControlSchedule({
    buildingType: appData?.buildingType ?? null,
    usagePurpose: appData?.usagePurpose ?? null,
    registrationDate: elevator.registrationDate ?? elevator.createdAt,
    lastPeriodicInspectionDate: periodicInspection?.conductedDate ?? null,
    lastNextInspectionDate: periodicInspection?.nextInspectionDate ?? null,
  });

  return (
    <AppShell title={`Dosja - ${elevator.registryNumber}`}>
      <div className="space-y-5 sm:space-y-6">
        {canVerifyPhysical && <PhysicalVerificationButton elevatorId={id} />}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{elevator.registryNumber}</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {elevator.buildingName ? `${elevator.buildingName} · ` : ""}
              {elevator.buildingAddress} · {elevator.municipality.nameSq}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm shadow-sm">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${display.dotClass}`} />
            {display.label}
          </div>
        </div>

        <ElevatorDossierTabs elevatorId={id} activeTab={activeTab} tabs={effectiveTabs} />

        {activeTab === "summary" && (isOwnerViewer || isStaffViewer) && (
          <>
            <ElevatorTabPanel groups={tabDossier.summary} />
            {isOwnerViewer && <ElevatorDeadlinesCard items={elevatorDeadlines} />}
            {elevator.status === "ACTIVE" && session.user.roleCode === ROLE_CODES.OWNER && (
              <ElevatorLifecycleApplicationsPanel elevatorId={id} />
            )}
          </>
        )}

        {activeTab === "technical" && <ElevatorTabPanel groups={tabDossier.technical} />}

        {activeTab === "certificate" && <ElevatorTabPanel groups={tabDossier.certificate} />}

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
            {isOwnerViewer && ownerPendingMaintenanceContracts.length > 0 && (
              <OwnerPendingServiceContracts elevatorId={id} contracts={ownerPendingMaintenanceContracts} />
            )}
            {(isMaintenanceViewer || certifierManagesMaintenance) && (
              <MaintenanceDossierActions
                elevatorId={id}
                registryNumber={elevator.registryNumber}
                pendingContract={maintenancePendingContract}
                showServiceLinks={isMaintenanceViewer}
                showInterventionForm={isMaintenanceViewer || certifierManagesMaintenance}
                showMonthlyReportForm={isMaintenanceViewer || certifierManagesMaintenance}
                hasActiveMaintenanceContract={viewerHasActiveMaintenanceContract}
                defaultTechnicianName={
                  isMaintenanceViewer ? buildTechnicianDisplayName(session.user) : undefined
                }
              />
            )}
            <MaintenanceRegistryPanel
              data={maintenanceRegistry}
              audience={
                isMaintenanceViewer || certifierManagesMaintenance
                  ? "maintenance"
                  : isIshmtViewer
                    ? "ishmt_staff"
                    : "owner"
              }
            />
            {isOwnerViewer && showMaintenanceAssignmentOnTab && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {needsMaintenanceAssignment
                      ? "Cakto kompaninë e mirëmbajtjes"
                      : "Ndrysho kompaninë e mirëmbajtjes"}
                  </CardTitle>
                  {canChangeMaintenanceCompany && activeMaintContract ? (
                    <CardDescription>
                      Për të caktuar kompani tjetër, duhet të ndërpritni kontratën aktive me arsye të
                      detyrueshme. Kompania e re pranon ftesën dhe ngarkon kontratën.
                    </CardDescription>
                  ) : (
                    <CardDescription>
                      Zgjidhni kompaninë dhe dërgoni ftesën. Dokumenti i kontratës ngarkohet nga kompania pas
                      pranimit.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <MaintenanceAssignmentForm
                    elevatorId={id}
                    companies={maintenanceCompanies}
                    certifiers={maintenanceCertifiers}
                    scope={{ needsMaintenance: true, needsInspection: false }}
                    changeFromActiveContract={
                      canChangeMaintenanceCompany && activeMaintContract
                        ? {
                            contractNumber: activeMaintContract.contractNumber,
                            companyName: elevator.maintenanceOrg?.name ?? "-",
                            companyNipt: elevator.maintenanceOrg?.nipt ?? null,
                          }
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "inspections" && (
          <div className="space-y-6">
            {isOwnerViewer && ownerPendingInspectionContracts.length > 0 && (
              <OwnerPendingServiceContracts elevatorId={id} contracts={ownerPendingInspectionContracts} />
            )}
            {isCertifierViewer && (
              <CertifierDossierActions
                elevatorId={id}
                registryNumber={elevator.registryNumber}
                pendingContract={certifierPendingContract}
                canLogPeriodicInspection={canLogPeriodicInspection}
              />
            )}
            <InspectionRegistryPanel
              data={inspectionRegistry}
              audience={
                isCertifierViewer ? "certifier" : isIshmtViewer ? "ishmt_staff" : "owner"
              }
              elevatorId={id}
            />
            {isOwnerViewer && showInspectionAssignmentOnInspectionsTab && canManageMaintenance && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {canChangeInspectionCompany
                      ? "Ndrysho organizatën e inspektimit periodik (OM)"
                      : "Cakto organizatën e inspektimit periodik (OM)"}
                  </CardTitle>
                  {canChangeInspectionCompany && activeInspectionContract ? (
                    <CardDescription>
                      Për të caktuar OM tjetër, duhet të ndërpritni kontratën aktive me arsye të detyrueshme.
                      Organizata e re pranon ftesën dhe ngarkon kontratën.
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <PeriodicControlAssignmentForm
                    elevatorId={id}
                    certifiers={maintenanceCertifiers}
                    schedule={periodicControlSchedule}
                    changeFromActiveContract={
                      canChangeInspectionCompany && activeInspectionContract
                        ? {
                            contractNumber: activeInspectionContract.contractNumber,
                            companyName: activeInspectionContract.maintenanceOrg?.name ?? "-",
                            companyNipt: activeInspectionContract.maintenanceOrg?.nipt ?? null,
                          }
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "history" && (isOwnerViewer || isStaffViewer || isInstallerViewer) && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Historiku</CardTitle>
              <p className="text-sm font-normal text-muted-foreground">
                Hapat e procesit sipas workflow-it, nga fillimi deri te veprimet e fundit.
              </p>
            </CardHeader>
            <CardContent>
              <ElevatorDossierTimeline events={dossierTimeline} />
            </CardContent>
          </Card>
        )}

        {activeTab === "applications" && (isOwnerViewer || isStaffViewer || isInstallerViewer) && (
          <ElevatorApplicationsPanel applications={elevatorApplications} />
        )}

        {activeTab === "documents" && (
          <Card>
            <CardHeader>
              <CardTitle>Dokumente</CardTitle>
            </CardHeader>
            <CardContent>
              <ElevatorDocumentsPanel documents={registrationDocuments} />
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

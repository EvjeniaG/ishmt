import { notFound, redirect } from "next/navigation";
import { ApplicationStatus, ApplicationType, ConformityResult, DataUpdateType, DelegationStatus, DelegationType, ReturnTargetRole } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import {
  CertifierForm,
  CertifierTechnicalReviewForm,
  InstallerTechnicalForm,
  InstallerTechnicalReconciliationForm,
} from "@/components/applications/application-workflow-forms";
import { ApplicationDocuments } from "@/components/applications/application-documents";
import { ApplicationDataSummary } from "@/components/applications/application-data-summary";
import type { ApplicationSummaryData } from "@/components/applications/application-data-summary";
import { ApplicationDocumentChecklistView } from "@/components/applications/application-document-checklist-view";
import { WorkflowSection, WorkflowSubsection } from "@/components/applications/workflow-section";
import { ApplicationWorkflowFooter } from "@/components/applications/application-workflow-layout";
import { CorrectionApplicationView } from "@/components/applications/correction-application-view";
import { DataUpdateApplicationView } from "@/components/applications/data-update-application-view";
import { DeregistrationApplicationView } from "@/components/applications/deregistration-application-view";
import { OwnershipTransferApplicationView } from "@/components/applications/ownership-transfer-application-view";
import { LifecycleSubmitPanel } from "@/components/lifecycle/lifecycle-submit-panel";
import { ModernizationWorkflowPanel } from "@/components/lifecycle/modernization-workflow-panel";
import { ApplicationDemoButton } from "@/components/demo/application-demo-button";
import { RegistrationWizard } from "@/components/owner/registration-wizard";
import { DelegationResponse } from "@/components/registration/delegation-response";
import { DelegateWorkflowProgress } from "@/components/registration/delegate-workflow-progress";
import { DelegationCompletePanel, RevokedDelegationPanel } from "@/components/registration/delegation-complete-panel";
import { ApplicationPageBanner } from "@/components/applications/application-page-banner";
import {
  ApplicationElevatorCard,
  ApplicationHistoryTimeline,
} from "@/components/applications/application-detail-extras";
import {
  getCertifierDelegateStepStates,
  getInstallerDelegateStepStates,
  isOwnerPostSubmitPhase,
  resolveRegistrationPhase,
  resolveRegistrationContextForCapabilities,
} from "@/lib/registration/phase-router";
import { DocumentService } from "@/lib/services/document-service";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { canActAsRole } from "@/lib/organizations/org-capabilities";
import { getAuthSession } from "@/lib/auth";
import { ApplicationService, ApplicationNotAccessibleError } from "@/lib/services/application-service";
import { serializeApplicationDataForClient } from "@/lib/application/serialize-application-data";
import {
  buildRegistrationDossier,
  buildRegistrationSubmissionChecklist,
} from "@/lib/registration/build-dossier";
import { OrganizationService } from "@/lib/services/organization-service";
import { getMunicipalities, getAdministrativeUnitsForMunicipality } from "@/lib/data/municipalities";
import { ROLE_CODES } from "@/lib/constants/roles";
import { OrgType } from "@prisma/client";
import { OwnershipTransferService } from "@/lib/services/ownership-transfer-service";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";
import { getApplicationDocumentSpecs, getMissingRequiredApplicationDocuments, getPhaseDocumentChecklist, getUploadedDocumentsChecklistForPhase, getVisibleApplicationDocumentSpecs, hasSupplementaryDocuments, type ApplicationDocumentSpec, type RegistrationDocPhase } from "@/lib/documents/application-document-checklist";
import { canRoleEditApplicationDocuments } from "@/lib/documents/application-document-editing";
import { getReturnToRoles, isReturnedToRole, applicationReturnBannerVisible } from "@/lib/workflows/return-targets";
import { ApplicationReturnBanner } from "@/components/applications/application-workflow-layout";
import { LegalDeadlineBadge } from "@/components/deadlines/deadline-badge";
import { ProcedureDeadlineNotice } from "@/components/deadlines/procedure-deadline-notice";
import { ApplicationIshmtProgress } from "@/components/applications/application-ishmt-progress";
import { isIshmtOwnerTrackingStatus } from "@/lib/ishmt/owner-ishmt-tracker";
import { DeadlineService } from "@/lib/deadlines/deadline-service";
import { displayCertifierOrganizationName } from "@/lib/elevators/format-om-body";
import { isDelegationRevokedForOrg } from "@/lib/delegation/delegation-revoked";
import { getInstallerTechnicalReview } from "@/lib/registration/installer-technical-review";
import { loadOwnerRegistrationPrefill, buildOwnerFieldSuggestions } from "@/lib/registration/owner-registration-prefill";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const ctx = {
    userId: session.user.id,
    email: session.user.email ?? "",
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    activeOrgId: session.user.activeOrgId,
    activeOrgType: session.user.activeOrgType,
    activeOrgName: session.user.activeOrgName,
    roleCode: session.user.roleCode,
    permissions: session.user.permissions,
    orgCapabilities: session.user.orgCapabilities ?? null,
  };

  if (!session.user.permissions.includes(PERMISSIONS.APPLICATIONS_VIEW_OWN)) {
    redirect("/unauthorized");
  }

  const application = await ApplicationService.getById(ctx, id).catch((error) => {
    if (error instanceof ApplicationNotAccessibleError) notFound();
    throw error;
  });

  const registrationContext =
    application.type === ApplicationType.NEW_REGISTRATION
      ? resolveRegistrationContextForCapabilities(ctx, {
          id: application.id,
          type: application.type,
          status: application.status,
          returnToRole: application.returnToRole,
          returnToRoles: application.returnToRoles,
          installerOrgId: application.installerOrgId,
          certifierOrgId: application.certifierOrgId,
          delegations: application.delegations,
          registrationExtendedData: application.data?.registrationExtendedData,
        })
      : null;
  const registrationPhase = registrationContext?.phase ?? null;
  const workflowRole = registrationContext?.workflowRole ?? session.user.roleCode;

  const municipalities = await getMunicipalities();
  const certifiers = (await OrganizationService.listActiveSelectableCompanies(OrgType.CERTIFIER))
    .filter((c) => c.id !== application.installerOrgId);
  const installers = (await OrganizationService.listActiveSelectableCompanies(OrgType.INSTALLER))
    .filter((c) => c.id !== application.certifierOrgId);
  const { MaintenanceAssignmentService } = await import("@/lib/services/maintenance-assignment-service");
  const maintenanceCompanies = application.type === ApplicationType.DATA_UPDATE
    ? (await MaintenanceAssignmentService.listMaintenanceCompaniesWithQkbStatus())
        .filter((c) => c.selectable)
        .map((c) => ({ id: c.id, name: c.name }))
    : [];

  const data = application.data;
  const clientApplicationData = data ? serializeApplicationDataForClient(data) : null;
  const adminUnits = data?.municipalityId
    ? await getAdministrativeUnitsForMunicipality(data.municipalityId)
    : [];
  const certDate = data?.installationCertificateDate
    ? new Date(data.installationCertificateDate).toISOString().slice(0, 10)
    : undefined;
  const examDate = data?.examinationDate
    ? new Date(data.examinationDate).toISOString().slice(0, 10)
    : undefined;

  const rawDocuments = await DocumentService.listForEntity("application", id);
  const linkedDocuments = await DocumentService.listLinkedForEntity("application", id);
  const uploadedPurposes = await DocumentService.listPurposesForEntity("application", id);
  const uploadedPurposeSet = new Set(uploadedPurposes);
  const documentChecklist = getVisibleApplicationDocumentSpecs({
    type: application.type,
    data,
    uploadedPurposes,
  }).map((item) => ({
    ...item,
    uploaded: uploadedPurposeSet.has(item.purpose),
  }));
  const missingDocumentLabels = getMissingRequiredApplicationDocuments({
    type: application.type,
    data,
    uploadedPurposes,
  }).map((item) => item.label);
  const documentBlockSubmit =
    missingDocumentLabels.length > 0
      ? `Plotësoni dosjen digjitale: mungon ${missingDocumentLabels.join(", ")}.`
      : null;
  const documents = linkedDocuments.length > 0
    ? linkedDocuments
    : rawDocuments.map((doc) => ({
        purpose: undefined as string | undefined,
        ...DocumentService.serializeDocument(doc),
        uploadedAt: doc.createdAt.toISOString(),
      }));
  const canUpload = session.user.permissions.includes(PERMISSIONS.DOCUMENTS_UPLOAD);
  const canEditDocuments =
    canUpload &&
    canRoleEditApplicationDocuments(workflowRole, application, registrationPhase);

  const certifierDisplayName = displayCertifierOrganizationName(
    application.certifierOrg?.name,
    data?.omiNumber,
  );

  const applicationSummaryData: ApplicationSummaryData | null = clientApplicationData
    ? {
        ...(clientApplicationData as ApplicationSummaryData),
        municipality: data?.municipalityId
          ? {
              nameSq: municipalities.find((m) => m.id === data.municipalityId)?.nameSq ?? "",
            }
          : null,
      }
    : null;

  const applicationSummaryOrgs = {
    owner: application.ownerOrg.name,
    installer: application.installerOrg?.name,
    certifier: certifierDisplayName,
  };

  const ownerPrefill =
    session.user.roleCode === ROLE_CODES.OWNER
      ? await loadOwnerRegistrationPrefill(session.user.id, session.user.activeOrgId, {
          excludeApplicationId:
            application.type === ApplicationType.NEW_REGISTRATION ? id : undefined,
        })
      : null;
  const ownerFieldSuggestions = buildOwnerFieldSuggestions(ownerPrefill);

  const ownerDocsUploaded = getUploadedDocumentsChecklistForPhase({
    phase: "owner",
    type: application.type,
    data,
    uploadedPurposes,
  });
  const installerDocsUploaded = getUploadedDocumentsChecklistForPhase({
    phase: "installer",
    type: application.type,
    data,
    uploadedPurposes,
  });

  const readOnlyDocsFor = (
    checklist: typeof documentChecklist,
    supplementaryPhase?: RegistrationDocPhase,
  ) => {
    const showSupplementary =
      supplementaryPhase != null && hasSupplementaryDocuments(documents, supplementaryPhase);
    if (checklist.length === 0 && !showSupplementary) return null;
    return (
      <ApplicationDocuments
        applicationId={id}
        documents={documents}
        canUpload={false}
        currentUserId={session.user.id}
        checklist={checklist}
        embedded
        supplementaryPhase={supplementaryPhase}
      />
    );
  };

  const ownerDocsReadOnly = readOnlyDocsFor(ownerDocsUploaded, "owner");
  const installerDocsReadOnly = readOnlyDocsFor(installerDocsUploaded, "installer");

  const docsChecklistView = (
    checklist: Array<ApplicationDocumentSpec & { uploaded?: boolean }>,
    supplementaryPhase?: RegistrationDocPhase,
    canUpload = false,
  ) => (
    <ApplicationDocumentChecklistView
      applicationId={id}
      checklist={checklist.map((item) => ({
        ...item,
        uploaded: item.uploaded ?? uploadedPurposeSet.has(item.purpose),
      }))}
      documents={documents}
      currentUserId={session.user.id}
      supplementaryPhase={supplementaryPhase}
      canUpload={canUpload}
    />
  );

  const isOwnerRegistration =
    session.user.roleCode === ROLE_CODES.OWNER && application.type === ApplicationType.NEW_REGISTRATION;

  const isRegistrationDelegate =
    application.type === ApplicationType.NEW_REGISTRATION &&
    (canActAsRole(ctx, ROLE_CODES.INSTALLER) || canActAsRole(ctx, ROLE_CODES.CERTIFIER));

  const installerDelegationRevoked =
    canActAsRole(ctx, ROLE_CODES.INSTALLER) &&
    isDelegationRevokedForOrg(application.delegations, ROLE_CODES.INSTALLER, ctx.activeOrgId, application);
  const certifierDelegationRevoked =
    canActAsRole(ctx, ROLE_CODES.CERTIFIER) &&
    isDelegationRevokedForOrg(application.delegations, ROLE_CODES.CERTIFIER, ctx.activeOrgId, application);
  const revokedReason = installerDelegationRevoked
    ? application.workflowHistory.find((h) => h.action === "INSTALLER_DELEGATION_REVOKED")?.comment
    : certifierDelegationRevoked
      ? application.workflowHistory.find((h) => h.action === "CERTIFIER_DELEGATION_REVOKED")?.comment
      : null;

  const revokedRoleLabel =
    installerDelegationRevoked ? ("instalues" as const) : certifierDelegationRevoked ? ("certifikues" as const) : null;
  const delegationRevokedView = Boolean(revokedRoleLabel);

  const installerTechnicalReview = getInstallerTechnicalReview(data);

  const installerFormActive =
    workflowRole === ROLE_CODES.INSTALLER && registrationPhase === "technical-data";
  const installerReconciliationActive =
    workflowRole === ROLE_CODES.INSTALLER && registrationPhase === "technical-reconciliation";
  const certifierReviewActive =
    workflowRole === ROLE_CODES.CERTIFIER && registrationPhase === "installer-technical-review";
  const certifierFormActive =
    workflowRole === ROLE_CODES.CERTIFIER && registrationPhase === "certification-data";

  // Documents are scoped to the workflow phase that is responsible for them, so each
  // actor uploads only its own documents at its respective step.
  const isRegistration = application.type === ApplicationType.NEW_REGISTRATION;
  const ownerChecklist = isRegistration
    ? getPhaseDocumentChecklist({ phase: "owner", type: application.type, data })
    : documentChecklist.filter((item) => item.phase === "owner");
  const installerChecklist = isRegistration
    ? getPhaseDocumentChecklist({ phase: "installer", type: application.type, data })
    : documentChecklist.filter((item) => item.phase === "installer");
  const certifierChecklist = isRegistration
    ? getPhaseDocumentChecklist({ phase: "certifier", type: application.type, data })
    : documentChecklist.filter((item) => item.phase === "certifier");

  const ownerLayoutPlanChecklist = ownerChecklist.filter((item) => item.purpose === "LAYOUT_PLAN");
  const ownerOtherDocsChecklist = ownerChecklist.filter((item) => item.purpose !== "LAYOUT_PLAN");

  const ownerChecklistWithUploadState = ownerChecklist.map((item) => ({
    ...item,
    uploaded: uploadedPurposeSet.has(item.purpose),
  }));

  const canUploadOwnerDocsAtFinalReview =
    isOwnerRegistration &&
    registrationPhase === "final-review" &&
    canEditDocuments;

  function registrationSupplementaryPhase(roleCode: string): RegistrationDocPhase | undefined {
    if (roleCode === ROLE_CODES.OWNER) return "owner";
    if (roleCode === ROLE_CODES.INSTALLER) return "installer";
    if (roleCode === ROLE_CODES.CERTIFIER) return "certifier";
    return undefined;
  }

  const embeddedDocsFor = (
    checklist: Array<ApplicationDocumentSpec & { uploaded?: boolean }>,
    slotKey: string,
    docs = documents,
    options?: { showChecklistSummary?: boolean; supplementaryPhase?: RegistrationDocPhase | null },
  ) => (
    <ApplicationDocuments
      key={slotKey}
      applicationId={id}
      documents={docs}
      canUpload={canEditDocuments}
      currentUserId={session.user.id}
      checklist={checklist.map((item) => ({
        ...item,
        uploaded: item.uploaded ?? uploadedPurposeSet.has(item.purpose),
      }))}
      embedded
      showChecklistSummary={options?.showChecklistSummary ?? true}
      supplementaryPhase={
        options?.supplementaryPhase === null
          ? undefined
          : (options?.supplementaryPhase ?? registrationSupplementaryPhase(workflowRole))
      }
    />
  );

  // Document upload is rendered inside the active phase form (not as a detached card below it).
  const documentsEmbeddedInForm =
    isOwnerRegistration ||
    installerFormActive ||
    installerReconciliationActive ||
    certifierReviewActive ||
    certifierFormActive;

  const isOwnerModernization =
    session.user.roleCode === ROLE_CODES.OWNER && application.type === ApplicationType.MODERNIZATION;

  const canEditOwnerFields =
    isOwnerRegistration &&
    (application.status === ApplicationStatus.DRAFT ||
      application.status === ApplicationStatus.PENDING_OWNER_SUBMISSION ||
      application.status === ApplicationStatus.CERTIFICATION_COMPLETED ||
      application.status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES ||
      (application.status === ApplicationStatus.RETURNED && isReturnedToRole(application, ReturnTargetRole.OWNER)));

  const showOwnerRegistrationDossier =
    isOwnerRegistration &&
    registrationPhase != null &&
    (registrationPhase === "final-review" || isOwnerPostSubmitPhase(registrationPhase));

  const registrationDossier = showOwnerRegistrationDossier
    ? buildRegistrationDossier(application)
    : null;

  const missingSubmissionFields =
    registrationDossier != null
      ? ApplicationService.validateSubmissionReadiness(application, data)
      : [];

  const submissionChecklist =
    registrationDossier != null
      ? buildRegistrationSubmissionChecklist(missingSubmissionFields, missingDocumentLabels, {
          hasCertificationIssues:
            application.status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES,
          conformityOk: data?.conformityResult !== ConformityResult.NON_CONFORM,
        })
      : undefined;

  const isOwnershipTransfer = data?.updateType === DataUpdateType.OWNERSHIP_TRANSFER;
  const ownershipDelegation = isOwnershipTransfer
    ? OwnershipTransferService.recipientDelegation(application.delegations)
    : undefined;
  const isTransferSender = ctx.activeOrgId === application.ownerOrgId;
  const isTransferRecipient = ownershipDelegation?.organizationId === ctx.activeOrgId;
  const recipientPending =
    ownershipDelegation?.status === DelegationStatus.INVITED ||
    ownershipDelegation?.status === DelegationStatus.PENDING;
  const ownershipBlockSubmit =
    isOwnershipTransfer && isTransferSender && ownershipDelegation?.status !== DelegationStatus.ACCEPTED
      ? ownershipDelegation?.status === DelegationStatus.REJECTED
        ? "Marrësi refuzoi - dërgoni ftesë të re."
        : ownershipDelegation
          ? "Në pritje të pranimit nga marrësi."
          : "Dërgoni ftesën te marrësi."
      : null;
  const lifecycleBlockSubmit = ownershipBlockSubmit ?? documentBlockSubmit;

  const correctionChanges =
    Array.isArray(data?.correctionFields) && data.correctionFields.length > 0;
  const updateChanges = Array.isArray(data?.updateFields) && data.updateFields.length > 0;
  const deregistrationReady = Boolean(data?.deregistrationReasonType && data?.deregistrationReason);
  const updateReady =
    Boolean(data?.updateType) &&
    (data?.updateType === DataUpdateType.CONTACT_UPDATE || updateChanges);

  const modernizationReady =
    Boolean(data?.modernizationType) &&
    Boolean(application.installerOrgId) &&
    Boolean(application.certifierOrgId);

  const lifecycleContentReady =
    (application.type === ApplicationType.DATA_CORRECTION && correctionChanges) ||
    (application.type === ApplicationType.DEREGISTRATION && deregistrationReady) ||
    (application.type === ApplicationType.DATA_UPDATE &&
      !isOwnershipTransfer &&
      updateReady) ||
    (application.type === ApplicationType.DATA_UPDATE &&
      isOwnershipTransfer &&
      ownershipDelegation?.status === DelegationStatus.ACCEPTED);

  const showLifecycleSubmit =
    application.type === ApplicationType.DEREGISTRATION ||
    application.type === ApplicationType.DATA_CORRECTION ||
    (application.type === ApplicationType.DATA_UPDATE && (!isOwnershipTransfer || isTransferSender));

  const elevatorDefaults = application.targetElevator
    ? {
        serialNumber: application.targetElevator.technicalData?.serialNumber ?? "",
        manufacturer: application.targetElevator.technicalData?.manufacturer ?? "",
        buildingAddress: application.targetElevator.buildingAddress ?? "",
        responsibleEntityName: data?.responsibleEntityName ?? application.ownerOrg.name,
        responsibleEntityIdentifier: data?.responsibleEntityIdentifier ?? application.ownerOrg.nipt ?? "",
        floorsServed: String(application.targetElevator.technicalData?.floorsServed ?? ""),
        capacityKg: String(application.targetElevator.technicalData?.capacityKg ?? ""),
        maintenanceOrgId: application.targetElevator.maintenanceOrgId ?? "",
      }
    : null;

  return (
    <AppShell title="Detajet e aplikimit">
      <div className="space-y-6">
        {delegationRevokedView && revokedRoleLabel ? (
          <RevokedDelegationPanel
            roleLabel={revokedRoleLabel}
            applicationNumber={application.applicationNumber}
            reason={revokedReason}
          />
        ) : (
          <>
        <ApplicationPageBanner
          applicationNumber={application.applicationNumber}
          type={application.type}
          status={application.status}
          updateType={data?.updateType}
          registrationPhase={registrationPhase}
          roleCode={workflowRole}
          compact={isOwnerRegistration && Boolean(registrationPhase)}
          hasChanges={
            (Array.isArray(data?.correctionFields) && data.correctionFields.length > 0) ||
            (Array.isArray(data?.updateFields) && data.updateFields.length > 0)
          }
          hasReason={Boolean(data?.deregistrationReasonType && data?.deregistrationReason)}
          hasModernization={Boolean(data?.modernizationType)}
          ownershipAccepted={ownershipDelegation?.status === DelegationStatus.ACCEPTED}
        />

        {applicationReturnBannerVisible(application, workflowRole) ? (
          <ApplicationReturnBanner
            returnReason={application.returnReason}
            requiredCorrection={application.requiredCorrection}
            returnToRoles={getReturnToRoles(application)}
          />
        ) : null}

        {isRegistrationDelegate &&
          registrationPhase &&
          registrationPhase !== "installer-complete" &&
          registrationPhase !== "certifier-complete" &&
          registrationPhase !== "completed" && (
          <DelegateWorkflowProgress
            title={
              workflowRole === ROLE_CODES.INSTALLER
                ? "Hapat e instaluesit"
                : "Hapat e certifikuesit"
            }
            steps={
              workflowRole === ROLE_CODES.INSTALLER
                ? getInstallerDelegateStepStates(registrationPhase)
                : getCertifierDelegateStepStates(registrationPhase)
            }
          />
        )}

        {application.submittedAt &&
          DeadlineService.isApplicationUnderProcedureReview(application.status) && (
          <ProcedureDeadlineNotice
            submittedAt={application.submittedAt}
            role={session.user.roleCode === ROLE_CODES.OWNER ? "owner" : "ishmt"}
          />
        )}

        {isIshmtOwnerTrackingStatus(application.status) && (
          <ApplicationIshmtProgress
            status={application.status}
            submittedAt={application.submittedAt}
          />
        )}

        {isOwnerRegistration && registrationPhase ? (
          <RegistrationWizard
            applicationId={id}
            phase={registrationPhase}
            status={application.status}
            returnToRole={application.returnToRole}
            returnToRoles={getReturnToRoles(application)}
            returnReason={application.returnReason}
            requiredCorrection={application.requiredCorrection}
            data={clientApplicationData}
            municipalities={municipalities}
            adminUnits={adminUnits}
            certifiers={certifiers}
            installers={installers}
            installerOrgId={application.installerOrgId}
            certifierOrgId={application.certifierOrgId}
            installerName={application.installerOrg?.name}
            certifierName={certifierDisplayName}
            canEditOwnerFields={canEditOwnerFields}
            layoutPlanSlot={
              ownerLayoutPlanChecklist.length > 0
                ? embeddedDocsFor(
                    ownerLayoutPlanChecklist,
                    "owner-layout-plan",
                    documents.filter((doc) => doc.purpose === "LAYOUT_PLAN"),
                    { showChecklistSummary: false, supplementaryPhase: null },
                  )
                : undefined
            }
            documentsSlot={
              ownerOtherDocsChecklist.length > 0
                ? embeddedDocsFor(ownerOtherDocsChecklist, "owner-docs")
                : undefined
            }
            ownerDocsSlot={docsChecklistView(
              ownerChecklistWithUploadState,
              "owner",
              canUploadOwnerDocsAtFinalReview,
            )}
            installerDocsSlot={docsChecklistView(installerChecklist, "installer")}
            certifierDocsSlot={docsChecklistView(certifierChecklist, "certifier")}
            blockSubmit={documentBlockSubmit}
            dossierSections={registrationDossier?.sections}
            submissionChecklist={submissionChecklist}
            ownerPrefill={application.type === ApplicationType.NEW_REGISTRATION ? ownerPrefill : null}
            canUploadOwnerDocs={canUploadOwnerDocsAtFinalReview}
          />
        ) : isRegistrationDelegate ? (
          <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
          <>
            {workflowRole === ROLE_CODES.INSTALLER && registrationPhase === "installer-accept" && (
              <>
                {applicationSummaryData && (
                  <ApplicationDataSummary
                    data={applicationSummaryData}
                    orgs={applicationSummaryOrgs}
                    title="Të dhënat e aplikimit"
                    hideTechnical
                    hideCertification
                  />
                )}
              <DelegationResponse
                applicationId={id}
                type="installer"
                applicationNumber={application.applicationNumber}
                buildingAddress={data?.buildingAddress}
                municipality={municipalities.find((m) => m.id === data?.municipalityId)?.nameSq}
                nextPath={`/portal/applications/${id}`}
              />
              </>
            )}

            {workflowRole === ROLE_CODES.CERTIFIER && registrationPhase === "certifier-accept" && (
              <>
                {applicationSummaryData && (
                  <ApplicationDataSummary
                    data={applicationSummaryData}
                    orgs={applicationSummaryOrgs}
                    title="Të dhënat e aplikimit"
                    hideCertification
                  />
                )}
              <DelegationResponse
                applicationId={id}
                type="certifier"
                applicationNumber={application.applicationNumber}
                buildingAddress={data?.buildingAddress}
                municipality={municipalities.find((m) => m.id === data?.municipalityId)?.nameSq}
                nextPath={`/portal/applications/${id}`}
              />
              </>
            )}

            {workflowRole === ROLE_CODES.INSTALLER &&
              registrationPhase === "technical-data" && (
                <InstallerTechnicalForm
                  applicationId={id}
                  certifiers={certifiers}
                  hideCertifierAssignment
                  applicationType={application.type}
                  uploadedPurposes={uploadedPurposes}
                  summaryData={applicationSummaryData}
                  orgs={applicationSummaryOrgs}
                  priorDocumentsSlot={
                    ownerDocsReadOnly ? (
                      <WorkflowSubsection title="Personi përgjegjës">
                        {ownerDocsReadOnly}
                      </WorkflowSubsection>
                    ) : undefined
                  }
                  documentsSlot={embeddedDocsFor(installerChecklist, "installer-docs")}
                  defaults={{
                    elevatorType: data?.elevatorType ?? undefined,
                    manufacturer: data?.manufacturer ?? undefined,
                    model: data?.model ?? undefined,
                    serialNumber: data?.serialNumber ?? undefined,
                    manufacturingYear: data?.manufacturingYear ?? undefined,
                    capacityKg: data?.capacityKg ?? undefined,
                    capacityPersons: data?.capacityPersons ?? undefined,
                    speedMs: data?.speedMs ? Number(data.speedMs) : undefined,
                    floorsServed: data?.floorsServed ?? undefined,
                  }}
                />
              )}

            {workflowRole === ROLE_CODES.INSTALLER &&
              registrationPhase === "technical-reconciliation" && (
                <InstallerTechnicalReconciliationForm
                  applicationId={id}
                  certifierNotes={installerTechnicalReview.certifierNotes}
                  installerResponse={installerTechnicalReview.installerResponse}
                  applicationType={application.type}
                  uploadedPurposes={uploadedPurposes}
                  summaryData={applicationSummaryData}
                  orgs={applicationSummaryOrgs}
                  priorDocumentsSlot={
                    ownerDocsReadOnly ? (
                      <WorkflowSubsection title="Personi përgjegjës">
                        {ownerDocsReadOnly}
                      </WorkflowSubsection>
                    ) : undefined
                  }
                  documentsSlot={embeddedDocsFor(installerChecklist, "installer-reconcile-docs")}
                  defaults={{
                    elevatorType: data?.elevatorType ?? undefined,
                    manufacturer: data?.manufacturer ?? undefined,
                    model: data?.model ?? undefined,
                    serialNumber: data?.serialNumber ?? undefined,
                    manufacturingYear: data?.manufacturingYear ?? undefined,
                    capacityKg: data?.capacityKg ?? undefined,
                    capacityPersons: data?.capacityPersons ?? undefined,
                    speedMs: data?.speedMs ? Number(data.speedMs) : undefined,
                    floorsServed: data?.floorsServed ?? undefined,
                  }}
                />
              )}

            {workflowRole === ROLE_CODES.CERTIFIER &&
              registrationPhase === "installer-technical-review" && (
                <CertifierTechnicalReviewForm
                  applicationId={id}
                  certifierNotes={installerTechnicalReview.certifierNotes}
                  installerResponse={installerTechnicalReview.installerResponse}
                  reviewStatus={installerTechnicalReview.status}
                  summaryData={applicationSummaryData}
                  orgs={applicationSummaryOrgs}
                  priorDocumentsSlot={
                    ownerDocsReadOnly || installerDocsReadOnly ? (
                      <WorkflowSection title="Dokumentet e instaluesit" description="Dosja e ngarkuar">
                        <div className="min-w-0 space-y-6">
                          {ownerDocsReadOnly && (
                            <WorkflowSubsection key="owner-docs" title="Personi përgjegjës">
                              {ownerDocsReadOnly}
                            </WorkflowSubsection>
                          )}
                          {installerDocsReadOnly && (
                            <WorkflowSubsection key="installer-docs" title="Instaluesi">
                              {installerDocsReadOnly}
                            </WorkflowSubsection>
                          )}
                        </div>
                      </WorkflowSection>
                    ) : null
                  }
                />
              )}

            {workflowRole === ROLE_CODES.CERTIFIER &&
              registrationPhase === "certification-data" && (
                <CertifierForm
                  applicationId={id}
                  applicationType={application.type}
                  uploadedPurposes={uploadedPurposes}
                  summaryData={applicationSummaryData}
                  orgs={applicationSummaryOrgs}
                  showApplicationSummary={false}
                  priorDocumentsSlot={
                    ownerDocsReadOnly || installerDocsReadOnly ? (
                      <div className="min-w-0 space-y-4 rounded-xl border border-border/60 bg-muted/15 p-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Dosja e instaluesit dhe personit përgjegjës</p>
                          <p className="text-xs text-muted-foreground">Dokumentet e ngarkuara nga palët e tjera (vetëm lexim).</p>
                        </div>
                        {ownerDocsReadOnly && (
                          <WorkflowSubsection key="owner-docs" title="Personi përgjegjës">
                            {ownerDocsReadOnly}
                          </WorkflowSubsection>
                        )}
                        {installerDocsReadOnly && (
                          <WorkflowSubsection key="installer-docs" title="Instaluesi">
                            {installerDocsReadOnly}
                          </WorkflowSubsection>
                        )}
                      </div>
                    ) : null
                  }
                  documentsSlot={embeddedDocsFor(certifierChecklist, "certifier-docs")}
                  defaults={{
                    installationCertificateNumber: data?.installationCertificateNumber ?? undefined,
                    installationCertificateDate: certDate,
                    certifierNotes: data?.certifierNotes ?? undefined,
                    omiNumber: data?.omiNumber ?? undefined,
                    examinationType: data?.examinationType ?? undefined,
                    examinationDate: examDate,
                    conformityResult: data?.conformityResult ?? undefined,
                    certificateReference: data?.certificateReference ?? undefined,
                    certifierTechnicalNotes: data?.certifierTechnicalNotes ?? undefined,
                  }}
                />
              )}

            {(registrationPhase === "installer-complete" || registrationPhase === "completed") &&
              workflowRole === ROLE_CODES.INSTALLER && (
              <div className="space-y-6">
                <DelegationCompletePanel
                  roleLabel="instalues"
                  applicationNumber={application.applicationNumber}
                  description={
                    registrationPhase === "completed"
                      ? "Aplikimi u miratua nga IQMT dhe ashensori u regjistrua me sukses."
                      : "Të dhënat teknike u plotësuan. Personi përgjegjës i ashensorit vazhdon me caktimin e kompanisë certifikuese."
                  }
                  approved={registrationPhase === "completed"}
                  registryNumber={application.targetElevator?.registryNumber}
                  elevatorId={application.targetElevator?.id}
                />
                {applicationSummaryData && (
                  <ApplicationDataSummary
                    data={applicationSummaryData}
                    orgs={applicationSummaryOrgs}
                    title={
                      registrationPhase === "completed"
                        ? "Të dhënat teknike (instaluesi)"
                        : "Të dhënat e aplikimit"
                    }
                    hideCertification
                  />
                )}
                {(ownerDocsReadOnly || installerDocsReadOnly) && (
                  <WorkflowSection title="Dokumentet" description="Dosja e ngarkuar në aplikim">
                    <div className="space-y-6">
                      {ownerDocsReadOnly && (
                        <WorkflowSubsection key="owner-docs" title="Personi përgjegjës">
                          {ownerDocsReadOnly}
                        </WorkflowSubsection>
                      )}
                      {installerDocsReadOnly && (
                        <WorkflowSubsection key="installer-docs" title="Instaluesi">
                          {installerDocsReadOnly}
                        </WorkflowSubsection>
                      )}
                    </div>
                  </WorkflowSection>
                )}
              </div>
            )}

            {(registrationPhase === "certifier-complete" || registrationPhase === "completed") &&
              workflowRole === ROLE_CODES.CERTIFIER && (
              <div className="space-y-6">
                <DelegationCompletePanel
                  roleLabel="certifikues"
                  applicationNumber={application.applicationNumber}
                  description={
                    registrationPhase === "completed"
                      ? "Aplikimi u miratua nga IQMT dhe ashensori u regjistrua me sukses."
                      : "Certifikimi u plotësua. Personi përgjegjës i ashensorit rishikon dossier-in dhe parashtron aplikimin te IQMT."
                  }
                  approved={registrationPhase === "completed"}
                  registryNumber={application.targetElevator?.registryNumber}
                  elevatorId={application.targetElevator?.id}
                />
                {applicationSummaryData && (
                  <ApplicationDataSummary
                    data={applicationSummaryData}
                    orgs={applicationSummaryOrgs}
                    title={
                      registrationPhase === "completed"
                        ? "Të dhënat e certifikimit"
                        : "Të dhënat e aplikimit"
                    }
                  />
                )}
                {(ownerDocsReadOnly || installerDocsReadOnly || certifierChecklist.length > 0) && (
                  <WorkflowSection title="Dokumentet" description="Dosja e ngarkuar në aplikim">
                    <div className="space-y-6">
                      {ownerDocsReadOnly && (
                        <WorkflowSubsection key="owner-docs" title="Personi përgjegjës">
                          {ownerDocsReadOnly}
                        </WorkflowSubsection>
                      )}
                      {installerDocsReadOnly && (
                        <WorkflowSubsection key="installer-docs" title="Instaluesi">
                          {installerDocsReadOnly}
                        </WorkflowSubsection>
                      )}
                      {certifierChecklist.length > 0 && (
                        <WorkflowSubsection key="certifier-docs" title="Certifikuesi (OM)">
                          {docsChecklistView(certifierChecklist, "certifier")}
                        </WorkflowSubsection>
                      )}
                    </div>
                  </WorkflowSection>
                )}
              </div>
            )}
          </>
          </div>
        ) : isOwnerModernization ? (
          <ModernizationWorkflowPanel
            applicationId={id}
            status={application.status}
            returnReason={application.returnReason}
            requiredCorrection={application.requiredCorrection}
            modernizationType={data?.modernizationType}
            modernizationNotes={data?.modernizationNotes}
            installerName={application.installerOrg?.name}
            certifierName={certifierDisplayName}
            hasInstaller={Boolean(application.installerOrgId)}
            hasCertifier={Boolean(application.certifierOrgId)}
            certifiers={certifiers}
            installers={installers}
            installerOrgId={application.installerOrgId}
          />
        ) : (
          <>
            {application.type === ApplicationType.DATA_CORRECTION && application.targetElevator && elevatorDefaults && (
              <CorrectionApplicationView
                applicationId={id}
                status={application.status}
                returnReason={application.returnReason}
                requiredCorrection={application.requiredCorrection}
                elevatorRegistry={application.targetElevator.registryNumber}
                elevatorAddress={application.targetElevator.buildingAddress}
                ownerName={application.ownerOrg.name}
                ownerNipt={application.ownerOrg.nipt}
                elevatorDefaults={elevatorDefaults}
                existingChanges={Array.isArray(data?.correctionFields) ? data.correctionFields : []}
                excludeElevatorId={application.targetElevator.id}
                suggestedFieldValues={ownerFieldSuggestions}
              />
            )}

            {application.type === ApplicationType.DATA_UPDATE &&
              application.targetElevator &&
              isOwnershipTransfer && (
                <OwnershipTransferApplicationView
                  applicationId={id}
                  applicationNumber={application.applicationNumber}
                  status={application.status}
                  returnReason={application.returnReason}
                  requiredCorrection={application.requiredCorrection}
                  elevatorRegistry={application.targetElevator.registryNumber}
                  elevatorAddress={application.targetElevator.buildingAddress}
                  ownerName={application.ownerOrg.name}
                  ownerNipt={application.ownerOrg.nipt}
                  targetNipt={data?.responsibleEntityIdentifier}
                  targetName={data?.responsibleEntityName}
                  delegationStatus={ownershipDelegation?.status}
                  isSender={isTransferSender}
                  isRecipient={isTransferRecipient}
                  recipientPending={recipientPending}
                  canInvite={
                    (application.status === ApplicationStatus.DRAFT ||
                      application.status === ApplicationStatus.RETURNED) &&
                    isTransferSender &&
                    (!ownershipDelegation ||
                      ownershipDelegation.status === DelegationStatus.REJECTED ||
                      ownershipDelegation.status === DelegationStatus.REVOKED ||
                      ownershipDelegation.status === DelegationStatus.EXPIRED)
                  }
                />
              )}

            {application.type === ApplicationType.DATA_UPDATE &&
              application.targetElevator &&
              !isOwnershipTransfer &&
              elevatorDefaults && (
                <DataUpdateApplicationView
                  applicationId={id}
                  status={application.status}
                  returnReason={application.returnReason}
                  requiredCorrection={application.requiredCorrection}
                  updateType={data?.updateType}
                  elevatorRegistry={application.targetElevator.registryNumber}
                  elevatorAddress={application.targetElevator.buildingAddress}
                  ownerName={application.ownerOrg.name}
                  ownerNipt={application.ownerOrg.nipt}
                  elevatorDefaults={elevatorDefaults}
                  existingChanges={Array.isArray(data?.updateFields) ? data.updateFields : []}
                  excludeElevatorId={application.targetElevator.id}
                  maintenanceCompanies={maintenanceCompanies}
                  suggestedFieldValues={ownerFieldSuggestions}
                />
              )}

            {application.type === ApplicationType.DEREGISTRATION && application.targetElevator && (
              <DeregistrationApplicationView
                applicationId={id}
                status={application.status}
                returnReason={application.returnReason}
                requiredCorrection={application.requiredCorrection}
                elevatorRegistry={application.targetElevator.registryNumber}
                elevatorAddress={application.targetElevator.buildingAddress}
                ownerName={application.ownerOrg.name}
                ownerNipt={application.ownerOrg.nipt}
                reasonType={data?.deregistrationReasonType}
                reasonText={data?.deregistrationReason}
              />
            )}
          </>
        )}

        {!documentsEmbeddedInForm && (
          (showLifecycleSubmit || isOwnerModernization) &&
          (application.status === ApplicationStatus.DRAFT ||
            application.status === ApplicationStatus.RETURNED ||
            application.status === ApplicationStatus.PENDING_OWNER_SUBMISSION) && (
            <ApplicationDemoButton
              applicationId={id}
              type={application.type}
              status={application.status}
              updateType={data?.updateType}
              hasModernization={Boolean(data?.modernizationType)}
              hasInstaller={Boolean(application.installerOrgId)}
              hasCertifier={Boolean(application.certifierOrgId)}
              hasChanges={
                (Array.isArray(data?.correctionFields) && data.correctionFields.length > 0) ||
                (Array.isArray(data?.updateFields) && data.updateFields.length > 0)
              }
              hasUpdateType={Boolean(data?.updateType)}
              hasReason={Boolean(data?.deregistrationReasonType && data?.deregistrationReason)}
              canInviteRecipient={
                isOwnershipTransfer &&
                isTransferSender &&
                (application.status === ApplicationStatus.DRAFT ||
                  application.status === ApplicationStatus.RETURNED) &&
                (!ownershipDelegation ||
                  ownershipDelegation.status === DelegationStatus.REJECTED ||
                  ownershipDelegation.status === DelegationStatus.REVOKED ||
                  ownershipDelegation.status === DelegationStatus.EXPIRED)
              }
              ownershipAccepted={ownershipDelegation?.status === DelegationStatus.ACCEPTED}
              onlyStep="lifecycle-documents"
            />
          )
        )}

        {((showLifecycleSubmit && lifecycleContentReady) || (isOwnerModernization && modernizationReady)) && (
          <ApplicationWorkflowFooter>
            {!documentsEmbeddedInForm && application.type !== ApplicationType.DATA_CORRECTION && (
              <ApplicationDocuments
                applicationId={id}
                documents={documents}
                canUpload={canEditDocuments}
                currentUserId={session.user.id}
                checklist={documentChecklist}
                embedded
                supplementaryPhase={registrationSupplementaryPhase(workflowRole) ?? "owner"}
              />
            )}
            <LifecycleSubmitPanel
              applicationId={id}
              type={application.type}
              status={application.status}
              blockSubmit={isOwnerModernization ? documentBlockSubmit : lifecycleBlockSubmit}
              variant="footer"
            />
          </ApplicationWorkflowFooter>
        )}

        {workflowRole === ROLE_CODES.INSTALLER &&
          application.type === ApplicationType.MODERNIZATION &&
          (application.status === ApplicationStatus.PENDING_INSTALLER ||
            (application.status === ApplicationStatus.RETURNED &&
              isReturnedToRole(application, ReturnTargetRole.INSTALLER))) && (
            <InstallerTechnicalForm
              applicationId={id}
              certifiers={certifiers}
              hideCertifierAssignment={false}
              defaults={{
                elevatorType: data?.elevatorType ?? application.targetElevator?.technicalData?.elevatorType ?? undefined,
                manufacturer: data?.manufacturer ?? application.targetElevator?.technicalData?.manufacturer ?? undefined,
                model: data?.model ?? application.targetElevator?.technicalData?.model ?? undefined,
                serialNumber: data?.serialNumber ?? application.targetElevator?.technicalData?.serialNumber ?? undefined,
                manufacturingYear: data?.manufacturingYear ?? application.targetElevator?.technicalData?.manufacturingYear ?? undefined,
                capacityKg: data?.capacityKg ?? application.targetElevator?.technicalData?.capacityKg ?? undefined,
                capacityPersons: data?.capacityPersons ?? application.targetElevator?.technicalData?.capacityPersons ?? undefined,
                speedMs: data?.speedMs ? Number(data.speedMs) : application.targetElevator?.technicalData?.speedMs ? Number(application.targetElevator.technicalData.speedMs) : undefined,
                floorsServed: data?.floorsServed ?? application.targetElevator?.technicalData?.floorsServed ?? undefined,
              }}
            />
          )}

        {workflowRole === ROLE_CODES.CERTIFIER &&
          application.type === ApplicationType.MODERNIZATION &&
          (application.status === ApplicationStatus.PENDING_CERTIFIER ||
            (application.status === ApplicationStatus.RETURNED &&
              isReturnedToRole(application, ReturnTargetRole.CERTIFIER))) && (
            <CertifierForm
              applicationId={id}
              defaults={{
                installationCertificateNumber: data?.installationCertificateNumber ?? undefined,
                installationCertificateDate: certDate,
                certifierNotes: data?.certifierNotes ?? undefined,
                omiNumber: data?.omiNumber ?? undefined,
                examinationType: data?.examinationType ?? undefined,
                examinationDate: examDate,
                conformityResult: data?.conformityResult ?? undefined,
                certificateReference: data?.certificateReference ?? undefined,
                certifierTechnicalNotes: data?.certifierTechnicalNotes ?? undefined,
              }}
            />
          )}

        {application.targetElevator && (
          <ApplicationElevatorCard
            elevatorId={application.targetElevator.id}
            registryNumber={application.targetElevator.registryNumber}
          />
        )}

        {application.workflowHistory.length > 0 && (
          <ApplicationHistoryTimeline
            entries={application.workflowHistory}
            statusLabels={APPLICATION_STATUS_LABELS}
          />
        )}
          </>
        )}
      </div>
    </AppShell>
  );
}

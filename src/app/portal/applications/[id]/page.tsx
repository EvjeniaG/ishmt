import { notFound, redirect } from "next/navigation";
import { ApplicationStatus, ApplicationType, ConformityResult, DataUpdateType, DelegationStatus, ReturnTargetRole } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import {
  CertifierForm,
  InstallerTechnicalForm,
} from "@/components/applications/application-workflow-forms";
import { ApplicationDocuments } from "@/components/applications/application-documents";
import { ApplicationDocumentChecklistView } from "@/components/applications/application-document-checklist-view";
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
import { DelegationCompletePanel } from "@/components/registration/delegation-complete-panel";
import { ApplicationPageBanner } from "@/components/applications/application-page-banner";
import {
  ApplicationElevatorCard,
  ApplicationHistoryTimeline,
} from "@/components/applications/application-detail-extras";
import {
  getCertifierDelegateStepStates,
  getInstallerDelegateStepStates,
  resolveRegistrationPhase,
} from "@/lib/registration/phase-router";
import { DocumentService } from "@/lib/services/document-service";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
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
import { getApplicationDocumentSpecs, getMissingRequiredApplicationDocuments, getVisibleApplicationDocumentSpecs } from "@/lib/documents/application-document-checklist";
import { getReturnToRoles, isReturnedToRole } from "@/lib/workflows/return-targets";
import { LegalDeadlineBadge } from "@/components/deadlines/deadline-badge";
import { ProcedureDeadlineNotice } from "@/components/deadlines/procedure-deadline-notice";
import { DeadlineService } from "@/lib/deadlines/deadline-service";
import { displayCertifierOrganizationName } from "@/lib/elevators/format-om-body";

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
  };

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_VIEW_OWN)) {
    redirect("/unauthorized");
  }

  const application = await ApplicationService.getById(ctx, id).catch((error) => {
    if (error instanceof ApplicationNotAccessibleError) notFound();
    throw error;
  });

  const registrationPhase =
    application.type === ApplicationType.NEW_REGISTRATION
      ? resolveRegistrationPhase(
          {
            id: application.id,
            type: application.type,
            status: application.status,
            returnToRole: application.returnToRole,
            returnToRoles: application.returnToRoles,
            installerOrgId: application.installerOrgId,
            certifierOrgId: application.certifierOrgId,
            delegations: application.delegations,
          },
          session.user.roleCode,
        )
      : null;

  const municipalities = await getMunicipalities();
  const installers = await OrganizationService.listActiveSelectableCompanies(OrgType.INSTALLER);
  const certifiers = await OrganizationService.listActiveSelectableCompanies(OrgType.CERTIFIER);
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
        ...DocumentService.serializeDocument(doc),
        uploadedAt: doc.createdAt.toISOString(),
      }));
  const canUpload = roleHasPermission(session.user.roleCode, PERMISSIONS.DOCUMENTS_UPLOAD);

  const certifierDisplayName = displayCertifierOrganizationName(
    application.certifierOrg?.name,
    data?.omiNumber,
  );

  const docsChecklistView = (checklist: typeof documentChecklist, title: string, allowDelete = false) => (
    <ApplicationDocumentChecklistView
      key={title}
      title={title}
      checklist={checklist}
      documents={documents}
      canDelete={allowDelete && canUpload}
    />
  );

  const isOwnerRegistration =
    session.user.roleCode === ROLE_CODES.OWNER && application.type === ApplicationType.NEW_REGISTRATION;

  const isRegistrationDelegate =
    application.type === ApplicationType.NEW_REGISTRATION &&
    (session.user.roleCode === ROLE_CODES.INSTALLER || session.user.roleCode === ROLE_CODES.CERTIFIER);

  const installerFormActive =
    session.user.roleCode === ROLE_CODES.INSTALLER && registrationPhase === "technical-data";
  const certifierFormActive =
    session.user.roleCode === ROLE_CODES.CERTIFIER && registrationPhase === "certification-data";

  // Documents are scoped to the workflow phase that is responsible for them, so each
  // actor uploads only its own documents at its respective step.
  const isRegistration = application.type === ApplicationType.NEW_REGISTRATION;
  const ownerChecklist = isRegistration
    ? documentChecklist.filter((item) => item.phase === "owner")
    : documentChecklist;
  const installerChecklist = documentChecklist.filter((item) => item.phase === "installer");
  const certifierChecklist = documentChecklist.filter((item) => item.phase === "certifier");

  const embeddedDocsFor = (checklist: typeof documentChecklist, slotKey: string) => (
    <ApplicationDocuments
      key={slotKey}
      applicationId={id}
      documents={documents}
      canUpload={canUpload}
      checklist={checklist}
      embedded
    />
  );

  // Document upload is rendered inside the active phase form (not as a detached card below it).
  const documentsEmbeddedInForm = isOwnerRegistration || installerFormActive || certifierFormActive;

  const isOwnerModernization =
    session.user.roleCode === ROLE_CODES.OWNER && application.type === ApplicationType.MODERNIZATION;

  const canEditOwnerFields =
    isOwnerRegistration &&
    (application.status === ApplicationStatus.DRAFT ||
      application.status === ApplicationStatus.PENDING_OWNER_SUBMISSION ||
      application.status === ApplicationStatus.CERTIFICATION_COMPLETED ||
      application.status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES ||
      (application.status === ApplicationStatus.RETURNED && isReturnedToRole(application, ReturnTargetRole.OWNER)));

  const registrationDossier =
    isOwnerRegistration && registrationPhase === "final-review"
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
        <ApplicationPageBanner
          applicationNumber={application.applicationNumber}
          type={application.type}
          status={application.status}
          updateType={data?.updateType}
          registrationPhase={registrationPhase}
          roleCode={session.user.roleCode}
          compact={isOwnerRegistration && Boolean(registrationPhase)}
          hasChanges={
            (Array.isArray(data?.correctionFields) && data.correctionFields.length > 0) ||
            (Array.isArray(data?.updateFields) && data.updateFields.length > 0)
          }
          hasReason={Boolean(data?.deregistrationReasonType && data?.deregistrationReason)}
          hasModernization={Boolean(data?.modernizationType)}
          ownershipAccepted={ownershipDelegation?.status === DelegationStatus.ACCEPTED}
        />

        {isRegistrationDelegate && registrationPhase && (
          <DelegateWorkflowProgress
            title={
              session.user.roleCode === ROLE_CODES.INSTALLER
                ? "Hapat e instaluesit"
                : "Hapat e certifikuesit"
            }
            steps={
              session.user.roleCode === ROLE_CODES.INSTALLER
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
            installers={installers}
            certifiers={certifiers}
            installerName={application.installerOrg?.name}
            certifierName={certifierDisplayName}
            canEditOwnerFields={canEditOwnerFields}
            documentsSlot={embeddedDocsFor(ownerChecklist, "owner-docs")}
            installerDocsSlot={docsChecklistView(installerChecklist, "Dokumentet e instaluesit")}
            certifierDocsSlot={docsChecklistView(certifierChecklist, "Dokumentet e certifikuesit (OMI)")}
            blockSubmit={documentBlockSubmit}
            dossierSections={registrationDossier?.sections}
            submissionChecklist={submissionChecklist}
          />
        ) : isRegistrationDelegate ? (
          <>
            {session.user.roleCode === ROLE_CODES.INSTALLER && registrationPhase === "installer-accept" && (
              <DelegationResponse
                applicationId={id}
                type="installer"
                applicationNumber={application.applicationNumber}
                buildingAddress={data?.buildingAddress}
                municipality={municipalities.find((m) => m.id === data?.municipalityId)?.nameSq}
                nextPath={`/portal/applications/${id}`}
              />
            )}

            {session.user.roleCode === ROLE_CODES.CERTIFIER && registrationPhase === "certifier-accept" && (
              <DelegationResponse
                applicationId={id}
                type="certifier"
                applicationNumber={application.applicationNumber}
                buildingAddress={data?.buildingAddress}
                municipality={municipalities.find((m) => m.id === data?.municipalityId)?.nameSq}
                nextPath={`/portal/applications/${id}`}
              />
            )}

            {session.user.roleCode === ROLE_CODES.INSTALLER &&
              registrationPhase === "technical-data" && (
                <InstallerTechnicalForm
                  applicationId={id}
                  certifiers={certifiers}
                  hideCertifierAssignment
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

            {session.user.roleCode === ROLE_CODES.CERTIFIER &&
              registrationPhase === "certification-data" && (
                <CertifierForm
                  applicationId={id}
                  applicationType={application.type}
                  uploadedPurposes={uploadedPurposes}
                  summaryData={data}
                  orgs={{
                    owner: application.ownerOrg.name,
                    installer: application.installerOrg?.name,
                    certifier: certifierDisplayName,
                  }}
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

            {registrationPhase === "installer-complete" && session.user.roleCode === ROLE_CODES.INSTALLER && (
              <DelegationCompletePanel
                roleLabel="instalues"
                applicationNumber={application.applicationNumber}
                description="Të dhënat teknike u plotësuan. Personi përgjegjës i ashensorit vazhdon me caktimin e kompanisë certifikuese."
              />
            )}

            {registrationPhase === "certifier-complete" && session.user.roleCode === ROLE_CODES.CERTIFIER && (
              <DelegationCompletePanel
                roleLabel="certifikues"
                applicationNumber={application.applicationNumber}
                description="Certifikimi u plotësua. Personi përgjegjës i ashensorit rishikon dossier-in dhe parashtron aplikimin te ISHMT."
              />
            )}
          </>
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
            installers={installers}
            certifiers={certifiers}
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
                canUpload={canUpload}
                checklist={documentChecklist}
                embedded
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

        {session.user.roleCode === ROLE_CODES.INSTALLER &&
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

        {session.user.roleCode === ROLE_CODES.CERTIFIER &&
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
      </div>
    </AppShell>
  );
}

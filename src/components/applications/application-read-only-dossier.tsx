import Link from "next/link";
import { ApplicationType, DataUpdateType } from "@prisma/client";
import { ApplicationDocuments, type ApplicationDocumentRow } from "@/components/applications/application-documents";
import { ApplicationDataSummary } from "@/components/applications/application-data-summary";
import { ApplicationDocumentChecklistView } from "@/components/applications/application-document-checklist-view";
import { ApplicationFieldVerificationCard } from "@/components/applications/application-field-verification-card";
import { AssetGenerationStatusCard } from "@/components/applications/asset-generation-status";
import { IshmtWorkflowTrail } from "@/components/applications/ishmt-workflow-trail";
import { WorkflowSection } from "@/components/applications/workflow-section";
import { RegistrationDossierView } from "@/components/registration/registration-dossier-view";
import { PortalTableWrap } from "@/components/shared/portal-table";
import { MODERNIZATION_TYPE_LABELS } from "@/lib/constants/lifecycle-labels";
import { getApplicationDocumentSpecs, getPhaseDocumentChecklist } from "@/lib/documents/application-document-checklist";
import { displayCertifierOrganizationName } from "@/lib/elevators/format-om-body";
import { buildRegistrationDossier } from "@/lib/registration/build-dossier";
import type { applicationInclude } from "@/lib/services/application-service";
import type { FieldChange } from "@/lib/services/elevator-lifecycle-service";
import type { Prisma } from "@prisma/client";
import { DATA_UPDATE_SUBTYPE_LABELS } from "@/lib/constants/application-type-guide";
import {
  OwnershipTransferReviewSections,
  ownershipRecipientFromApplication,
  ownershipTransferReasonFromChanges,
} from "@/components/applications/ownership-transfer-review-sections";
import { OwnershipTransferService } from "@/lib/services/ownership-transfer-service";

type ApplicationForDossier = Prisma.ApplicationGetPayload<{ include: typeof applicationInclude }>;

type WorkflowTrail = Awaited<
  ReturnType<typeof import("@/lib/services/application-service").ApplicationService.getIshmtWorkflowTrail>
>;

type FieldVerificationStatus = Awaited<
  ReturnType<
    typeof import("@/lib/services/application-service").ApplicationService.getApplicationFieldVerificationStatus
  >
>;

function FieldChangesTable({ changes }: { changes: FieldChange[] }) {
  if (changes.length === 0) return null;
  return (
    <PortalTableWrap>
      <thead>
        <tr>
          <th>Fusha</th>
          <th>Vlera e vjetër</th>
          <th>Vlera e re</th>
          <th>Arsyeja</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((c) => (
          <tr key={c.field}>
            <td className="font-medium">{c.label ?? c.field}</td>
            <td className="text-muted-foreground">{c.oldValue ?? "-"}</td>
            <td>{c.newValue}</td>
            <td className="text-muted-foreground">{c.reason ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </PortalTableWrap>
  );
}

export function ApplicationReadOnlyDossier({
  application,
  applicationId,
  documents,
  documentChecklist,
  uploadedPurposeSet,
  workflowTrail,
  fieldVerificationStatus,
  currentUserId,
  showAssetGeneration = true,
  showFieldVerification = true,
  showElevatorLink = true,
}: {
  application: ApplicationForDossier;
  applicationId: string;
  documents: ApplicationDocumentRow[];
  documentChecklist: ReturnType<typeof getApplicationDocumentSpecs>;
  uploadedPurposeSet: Set<string>;
  workflowTrail: WorkflowTrail;
  fieldVerificationStatus: FieldVerificationStatus;
  currentUserId: string;
  showAssetGeneration?: boolean;
  showFieldVerification?: boolean;
  showElevatorLink?: boolean;
}) {
  const data = application.data;
  const isOwnershipTransfer = data?.updateType === DataUpdateType.OWNERSHIP_TRANSFER;
  const isRegistration = application.type === ApplicationType.NEW_REGISTRATION;
  const registrationDossierSections = isRegistration ? buildRegistrationDossier(application).sections : [];
  const checklistWithUploadState = documentChecklist.map((item) => ({
    ...item,
    uploaded: uploadedPurposeSet.has(item.purpose),
  }));

  const ownerChecklist = isRegistration
    ? getPhaseDocumentChecklist({ phase: "owner", type: application.type, data }).map((item) => ({
        ...item,
        uploaded: uploadedPurposeSet.has(item.purpose),
      }))
    : checklistWithUploadState.filter((item) => item.phase === "owner");
  const installerChecklist = isRegistration
    ? getPhaseDocumentChecklist({ phase: "installer", type: application.type, data }).map((item) => ({
        ...item,
        uploaded: uploadedPurposeSet.has(item.purpose),
      }))
    : checklistWithUploadState.filter((item) => item.phase === "installer");
  const certifierChecklist = isRegistration
    ? getPhaseDocumentChecklist({ phase: "certifier", type: application.type, data }).map((item) => ({
        ...item,
        uploaded: uploadedPurposeSet.has(item.purpose),
      }))
    : checklistWithUploadState.filter((item) => item.phase === "certifier");

  const registrationDocSlots =
    isRegistration && registrationDossierSections.length > 0
      ? {
          ownerDocsSlot:
            ownerChecklist.length > 0 ? (
              <ApplicationDocumentChecklistView
                applicationId={applicationId}
                checklist={ownerChecklist}
                documents={documents}
                currentUserId={currentUserId}
                supplementaryPhase="owner"
              />
            ) : undefined,
          installerDocsSlot:
            installerChecklist.length > 0 ? (
              <ApplicationDocumentChecklistView
                applicationId={applicationId}
                checklist={installerChecklist}
                documents={documents}
                currentUserId={currentUserId}
                supplementaryPhase="installer"
              />
            ) : undefined,
          certifierDocsSlot:
            certifierChecklist.length > 0 ? (
              <ApplicationDocumentChecklistView
                applicationId={applicationId}
                checklist={certifierChecklist}
                documents={documents}
                currentUserId={currentUserId}
                supplementaryPhase="certifier"
              />
            ) : undefined,
        }
      : null;

  const correctionChanges = Array.isArray(data?.correctionFields)
    ? (data.correctionFields as FieldChange[])
    : [];
  const updateChanges = Array.isArray(data?.updateFields) ? (data.updateFields as FieldChange[]) : [];
  const ownershipRecipientDelegation = isOwnershipTransfer
    ? OwnershipTransferService.recipientDelegation(application.delegations)
    : null;
  const ownershipRecipient = isOwnershipTransfer
    ? ownershipRecipientFromApplication({
        responsibleEntityName: data?.responsibleEntityName,
        responsibleEntityIdentifier: data?.responsibleEntityIdentifier,
        organization: ownershipRecipientDelegation?.organization,
        delegationStatus: ownershipRecipientDelegation?.status,
      })
    : null;
  const ownershipTransferReason = isOwnershipTransfer
    ? ownershipTransferReasonFromChanges(updateChanges)
    : null;

  const certifierDisplayName = displayCertifierOrganizationName(
    application.certifierOrg?.name,
    data?.omiNumber,
  );

  const elevator = application.targetElevator ?? application.originElevator;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {isRegistration && registrationDossierSections.length > 0 && registrationDocSlots ? (
        <div className="reg-wizard-panel">
          <div className="reg-wizard-body">
            <RegistrationDossierView
              sections={registrationDossierSections}
              ownerDocsSlot={registrationDocSlots.ownerDocsSlot}
              installerDocsSlot={registrationDocSlots.installerDocsSlot}
              certifierDocsSlot={registrationDocSlots.certifierDocsSlot}
            />
          </div>
        </div>
      ) : isOwnershipTransfer ? (
        <OwnershipTransferReviewSections
          currentOwnerName={application.ownerOrg.name}
          currentOwnerNipt={application.ownerOrg.nipt}
          recipient={ownershipRecipient}
          elevatorRegistry={application.targetElevator?.registryNumber}
          elevatorAddress={application.targetElevator?.buildingAddress ?? data?.buildingAddress}
          transferReason={ownershipTransferReason}
        />
      ) : (
        <>
          <WorkflowSection title="Dosja e aplikimit" description="Të dhënat kryesore të parashtruara">
            <div className="workflow-data-grid">
              <div className="workflow-data-cell">
                <p className="workflow-data-label">Personi përgjegjës i ashensorit</p>
                <p className="workflow-data-value">{application.ownerOrg.name}</p>
              </div>
              {application.type === ApplicationType.DEREGISTRATION && (
                <>
                  <div className="workflow-data-cell">
                    <p className="workflow-data-label">Ashensori</p>
                    <p className="workflow-data-value">{application.targetElevator?.registryNumber ?? "-"}</p>
                  </div>
                  <div className="workflow-data-cell">
                    <p className="workflow-data-label">Arsye</p>
                    <p className="workflow-data-value">{data?.deregistrationReasonType ?? "-"}</p>
                  </div>
                  <div className="workflow-data-cell md:col-span-2">
                    <p className="workflow-data-label">Shpjegim</p>
                    <p className="workflow-data-value">{data?.deregistrationReason ?? "-"}</p>
                  </div>
                </>
              )}
              {(application.type === ApplicationType.DATA_CORRECTION ||
                application.type === ApplicationType.DATA_UPDATE) && (
                <>
                  <div className="workflow-data-cell">
                    <p className="workflow-data-label">Ashensori</p>
                    <p className="workflow-data-value">{application.targetElevator?.registryNumber ?? "-"}</p>
                  </div>
                  {application.type === ApplicationType.DATA_UPDATE && !isOwnershipTransfer && (
                    <div className="workflow-data-cell">
                      <p className="workflow-data-label">Lloji përditësimi</p>
                      <p className="workflow-data-value">
                        {data?.updateType && data.updateType in DATA_UPDATE_SUBTYPE_LABELS
                          ? DATA_UPDATE_SUBTYPE_LABELS[
                              data.updateType as keyof typeof DATA_UPDATE_SUBTYPE_LABELS
                            ]
                          : (data?.updateType ?? "-")}
                      </p>
                    </div>
                  )}
                </>
              )}
              {application.type === ApplicationType.MODERNIZATION && (
                <>
                  <div className="workflow-data-cell">
                    <p className="workflow-data-label">Ashensori</p>
                    <p className="workflow-data-value">{application.targetElevator?.registryNumber ?? "-"}</p>
                  </div>
                  <div className="workflow-data-cell">
                    <p className="workflow-data-label">Instalues</p>
                    <p className="workflow-data-value">{application.installerOrg?.name ?? "-"}</p>
                  </div>
                  <div className="workflow-data-cell">
                    <p className="workflow-data-label">Certifikues</p>
                    <p className="workflow-data-value">{certifierDisplayName ?? "-"}</p>
                  </div>
                  <div className="workflow-data-cell">
                    <p className="workflow-data-label">Lloji modernizimit</p>
                    <p className="workflow-data-value">
                      {data?.modernizationType
                        ? MODERNIZATION_TYPE_LABELS[data.modernizationType]
                        : "-"}
                    </p>
                  </div>
                  <div className="workflow-data-cell md:col-span-2">
                    <p className="workflow-data-label">Përshkrimi</p>
                    <p className="workflow-data-value">{data?.modernizationNotes ?? "-"}</p>
                  </div>
                </>
              )}
            </div>
          </WorkflowSection>

          <ApplicationDataSummary
            data={data}
            orgs={{
              owner: application.ownerOrg.name,
              installer: application.installerOrg?.name,
              certifier: certifierDisplayName,
            }}
            title="Të dhënat e regjistruara"
          />

          <ApplicationDocuments
            applicationId={applicationId}
            documents={documents}
            canUpload={false}
            checklist={checklistWithUploadState}
            sectionTitle="Dokumentet"
            sectionDescription="Dosja e ngarkuar në aplikim"
            showAllSupplementary
          />
        </>
      )}

      {application.type === ApplicationType.DATA_CORRECTION && correctionChanges.length > 0 && (
        <WorkflowSection title="Ndryshimet e kërkuara" description="Korrigjime të dhënash">
          <FieldChangesTable changes={correctionChanges} />
        </WorkflowSection>
      )}

      {application.type === ApplicationType.DATA_UPDATE &&
        !isOwnershipTransfer &&
        updateChanges.length > 0 && (
        <WorkflowSection title="Ndryshimet e kërkuara" description="Përditësime të dhënash">
          <FieldChangesTable changes={updateChanges} />
        </WorkflowSection>
      )}

      {showAssetGeneration && isRegistration && (
        <AssetGenerationStatusCard
          applicationId={applicationId}
          status={application.assetGenerationStatus}
          error={application.assetGenerationError}
        />
      )}

      {showFieldVerification && (
        <ApplicationFieldVerificationCard status={fieldVerificationStatus} />
      )}

      <IshmtWorkflowTrail
        history={workflowTrail.history}
        fieldAssignments={workflowTrail.fieldAssignments}
        inspectorNames={workflowTrail.inspectorNames}
        lockedBy={workflowTrail.lockedBy}
        plannedInspectorIds={workflowTrail.plannedInspectorIds}
      />

      {showElevatorLink && elevator && (
        <div className="reg-wizard-panel shrink-0">
          <div className="reg-wizard-body">
            <p className="text-sm font-semibold text-foreground">Dosja e ashensorit</p>
            <Link
              href={`/portal/elevators/${elevator.id}`}
              className="mt-2 inline-block text-sm text-gov-primary hover:underline"
            >
              Shiko dosjen e plotë digjitale të ashensorit →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { ApplicationStatus } from "@prisma/client";
import {
  CancelApplicationButton,
} from "@/components/applications/application-workflow-forms";
import { RegistrationBasicDataForm } from "@/components/registration/basic-data-form";
import { RegistrationDossierView } from "@/components/registration/registration-dossier-view";
import { RegistrationPreSubmitReview } from "@/components/registration/registration-pre-submit-review";
import type { DossierSection } from "@/lib/registration/build-dossier";
import {
  AssignCertifierFormWrapper,
  AssignInstallerFormWrapper,
} from "@/components/owner/owner-application-forms";
import { buildRegistrationFormDefaults } from "@/lib/registration/basic-data-defaults";
import type { OwnerRegistrationPrefill } from "@/lib/registration/owner-registration-prefill";
import type { SelectableRegistryCompany } from "@/lib/organizations/registry-company-display";
import { RegistrationWizardProgress } from "@/components/registration/workflow-progress";
import { RegistrationWaitingPanel } from "@/components/registration/registration-waiting-panel";
import { RegistrationWizardBody } from "@/components/registration/registration-wizard-shell";
import {
  AlertPanel,
  SummaryField,
  SummaryGrid,
} from "@/components/registration/registration-ui";
import { DemoStepFillButton } from "@/components/demo/demo-step-fill-button";
import {
  revokeCertifierDelegationAction,
  revokeInstallerDelegationAction,
} from "@/lib/actions/delegation-actions";
import { isIshmtOwnerTrackingStatus } from "@/lib/ishmt/owner-ishmt-tracker";
import {
  getOwnerPhaseDescription,
  getOwnerPhaseTitle,
  type RegistrationPhase,
} from "@/lib/registration/phase-router";
import { isReturnedToRole } from "@/lib/workflows/return-targets";
import { ReturnTargetRole, type ReturnTargetRole as ReturnTargetRoleType } from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AppData = {
  buildingName?: string | null;
  buildingAddress?: string | null;
  municipalityId?: string | null;
  entrance?: string | null;
  floorLocation?: string | null;
  buildingType?: string | null;
  usagePurpose?: string | null;
  responsibleEntityName?: string | null;
  responsibleEntityIdentifier?: string | null;
  responsibleEntityEmail?: string | null;
  responsibleEntityPhone?: string | null;
  notes?: string | null;
  elevatorType?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  manufacturingYear?: number | null;
  capacityKg?: number | null;
  capacityPersons?: number | null;
  speedMs?: unknown;
  floorsServed?: number | null;
  stops?: number | null;
  driveType?: string | null;
  installationCertificateNumber?: string | null;
  installationCertificateDate?: Date | null;
  omiNumber?: string | null;
  examinationType?: string | null;
  examinationDate?: Date | null;
  conformityResult?: string | null;
};

function BasicDataSummary({
  data,
  municipalities,
}: {
  data: AppData | null;
  municipalities: { id: string; nameSq: string }[];
}) {
  return (
    <SummaryGrid>
      <SummaryField label="Adresa" value={data?.buildingAddress} />
      <SummaryField label="Bashkia" value={municipalities.find((m) => m.id === data?.municipalityId)?.nameSq} />
      <SummaryField label="Përgjegjësi" value={data?.responsibleEntityName} />
    </SummaryGrid>
  );
}

function PostSubmitPanel({ status, phase }: { status: ApplicationStatus; phase: RegistrationPhase }) {
  const approvedStatuses: ApplicationStatus[] = [
    ApplicationStatus.APPROVED,
    ApplicationStatus.ELEVATOR_CREATED,
    ApplicationStatus.ASSETS_GENERATED,
    ApplicationStatus.CLOSED,
  ];
  const isApproved = approvedStatuses.includes(status);
  const description = getOwnerPhaseDescription(phase);

  return (
    <div className={cn("reg-wizard-panel border-l-[3px]", isApproved ? "border-l-gov-success" : "border-l-gov-secondary")}>
      <RegistrationWizardBody>
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              isApproved ? "bg-emerald-100 text-gov-success" : "bg-muted text-gov-secondary",
            )}
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{getOwnerPhaseTitle(phase)}</h2>
            {description ? (
              <p className="mt-2 text-base text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </RegistrationWizardBody>
    </div>
  );
}

export function RegistrationWizard({
  applicationId,
  phase,
  status,
  returnToRole,
  returnToRoles = [],
  returnReason,
  requiredCorrection,
  data,
  municipalities,
  adminUnits,
  certifiers,
  installers,
  installerOrgId,
  certifierOrgId,
  installerName,
  certifierName,
  canEditOwnerFields,
  layoutPlanSlot,
  documentsSlot,
  installerDocsSlot,
  certifierDocsSlot,
  ownerDocsSlot,
  blockSubmit,
  dossierSections,
  submissionChecklist,
  ownerPrefill,
  canUploadOwnerDocs = false,
}: {
  applicationId: string;
  phase: RegistrationPhase;
  status: ApplicationStatus;
  returnToRole?: string | null;
  returnToRoles?: ReturnTargetRole[];
  returnReason?: string | null;
  requiredCorrection?: string | null;
  data: AppData | null;
  ownerPrefill?: OwnerRegistrationPrefill | null;
  municipalities: { id: string; nameSq: string; code?: string | null; legacyRegistryCode?: string | null }[];
  adminUnits: { id: string; nameSq: string }[];
  certifiers: SelectableRegistryCompany[];
  installers: SelectableRegistryCompany[];
  installerOrgId?: string | null;
  certifierOrgId?: string | null;
  installerName?: string | null;
  certifierName?: string | null;
  canEditOwnerFields: boolean;
  layoutPlanSlot?: React.ReactNode;
  documentsSlot?: React.ReactNode;
  installerDocsSlot?: React.ReactNode;
  certifierDocsSlot?: React.ReactNode;
  ownerDocsSlot?: React.ReactNode;
  blockSubmit?: string | null;
  dossierSections?: DossierSection[];
  submissionChecklist?: { key: string; label: string; ok: boolean }[];
  canUploadOwnerDocs?: boolean;
}) {
  const inIshmtReview = isIshmtOwnerTrackingStatus(status);
  const showPostSubmit =
    status !== ApplicationStatus.RETURNED &&
    (["submitted", "review", "completed"].includes(phase) || inIshmtReview);

  return (
    <div className="space-y-4">
      {!inIshmtReview ? <RegistrationWizardProgress phase={phase} /> : null}

      {showPostSubmit && (
        <>
          {!inIshmtReview ? <PostSubmitPanel status={status} phase={phase} /> : null}
          <div className="reg-wizard-panel">
            <RegistrationWizardBody>
              {dossierSections ? (
                <RegistrationDossierView
                  sections={dossierSections}
                  ownerDocsSlot={ownerDocsSlot}
                  installerDocsSlot={installerDocsSlot}
                  certifierDocsSlot={certifierDocsSlot}
                />
              ) : (
                <BasicDataSummary data={data} municipalities={municipalities} />
              )}
            </RegistrationWizardBody>
          </div>
        </>
      )}

      {phase === "rejected" && (
        <AlertPanel variant="danger" title="Aplikimi u refuzua" icon={AlertTriangle}>
          Ky aplikim u refuzua nga IQMT dhe nuk mund të vazhdojë.
        </AlertPanel>
      )}

      {!showPostSubmit && phase !== "rejected" && (
        <div className="reg-wizard-panel">
          <RegistrationWizardBody>
            {phase === "basic-data" && (
              <>
                {canEditOwnerFields ? (
                  <RegistrationBasicDataForm
                    applicationId={applicationId}
                    municipalities={municipalities}
                    defaults={buildRegistrationFormDefaults(data, ownerPrefill)}
                    layoutPlanSlot={layoutPlanSlot}
                    documentsSlot={documentsSlot}
                  />
                ) : (
                  <>
                    <BasicDataSummary data={data} municipalities={municipalities} />
                    {documentsSlot && <div className="mt-6 border-t border-border/60 pt-5">{documentsSlot}</div>}
                  </>
                )}
              </>
            )}

            {phase === "select-installer" && (
              <>
                <DemoStepFillButton applicationId={applicationId} step="owner-assign-installer" className="mb-4" />
                <AssignInstallerFormWrapper
                  applicationId={applicationId}
                  installers={installers}
                  certifierOrgId={certifierOrgId}
                />
              </>
            )}

            {phase === "wait-installer" && (
              <RegistrationWaitingPanel
                companyName={installerName}
                roleLabel="instaluesit"
                mode={
                  status === ApplicationStatus.RETURNED &&
                  isReturnedToRole(
                    { returnToRole: returnToRole as ReturnTargetRoleType | null, returnToRoles },
                    ReturnTargetRole.INSTALLER,
                  )
                    ? "return-correction"
                    : "delegation"
                }
                onRevoke={
                  status === ApplicationStatus.RETURNED &&
                  isReturnedToRole(
                    { returnToRole: returnToRole as ReturnTargetRoleType | null, returnToRoles },
                    ReturnTargetRole.INSTALLER,
                  )
                    ? undefined
                    : (reason) => revokeInstallerDelegationAction(applicationId, reason)
                }
              />
            )}

            {phase === "select-certifier" && (
              <>
                <DemoStepFillButton applicationId={applicationId} step="owner-assign-certifier" className="mb-4" />
                <AssignCertifierFormWrapper
                  applicationId={applicationId}
                  certifiers={certifiers}
                  installerOrgId={installerOrgId}
                />
              </>
            )}

            {phase === "wait-certifier" && (
              <RegistrationWaitingPanel
                companyName={certifierName}
                roleLabel="certifikuesit"
                mode={
                  status === ApplicationStatus.RETURNED &&
                  isReturnedToRole(
                    { returnToRole: returnToRole as ReturnTargetRoleType | null, returnToRoles },
                    ReturnTargetRole.CERTIFIER,
                  )
                    ? "return-correction"
                    : "delegation"
                }
                onRevoke={
                  status === ApplicationStatus.RETURNED &&
                  isReturnedToRole(
                    { returnToRole: returnToRole as ReturnTargetRoleType | null, returnToRoles },
                    ReturnTargetRole.CERTIFIER,
                  )
                    ? undefined
                    : (reason) => revokeCertifierDelegationAction(applicationId, reason)
                }
              />
            )}

            {phase === "final-review" && dossierSections && submissionChecklist && data && (
              <RegistrationPreSubmitReview
                applicationId={applicationId}
                status={status}
                sections={dossierSections}
                installerDocsSlot={installerDocsSlot}
                certifierDocsSlot={certifierDocsSlot}
                ownerDocsSlot={ownerDocsSlot}
                checklist={submissionChecklist}
                blockSubmit={blockSubmit}
                canUploadOwnerDocs={canUploadOwnerDocs}
                canEditOwnerData={canEditOwnerFields}
                ownerDataEditForm={
                  canEditOwnerFields ? (
                    <RegistrationBasicDataForm
                      applicationId={applicationId}
                      municipalities={municipalities}
                      defaults={buildRegistrationFormDefaults(data, ownerPrefill)}
                      layoutPlanSlot={layoutPlanSlot}
                      documentsSlot={documentsSlot}
                      editMode="pre-submit"
                    />
                  ) : undefined
                }
              />
            )}
          </RegistrationWizardBody>
        </div>
      )}

      {(status === ApplicationStatus.DRAFT || status === ApplicationStatus.BASIC_DATA_COMPLETED) && (
        <CancelApplicationButton applicationId={applicationId} />
      )}
    </div>
  );
}

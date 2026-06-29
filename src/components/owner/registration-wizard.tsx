"use client";

import { ApplicationStatus } from "@prisma/client";
import {
  CancelApplicationButton,
} from "@/components/applications/application-workflow-forms";
import { RegistrationBasicDataForm } from "@/components/registration/basic-data-form";
import { RegistrationPreSubmitReview } from "@/components/registration/registration-pre-submit-review";
import type { DossierSection } from "@/lib/registration/build-dossier";
import {
  AssignCertifierFormWrapper,
  AssignInstallerFormWrapper,
} from "@/components/owner/owner-application-forms";
import { buildRegistrationFormDefaults } from "@/lib/registration/basic-data-defaults";
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
  getOwnerPhaseTitle,
  type RegistrationPhase,
} from "@/lib/registration/phase-router";
import { RETURN_TARGET_LABELS } from "@/lib/workflows/return-targets";
import type { ReturnTargetRole } from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
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
            {status === ApplicationStatus.PENDING_CHIEF_INSPECTOR && (
              <p className="mt-2 text-sm text-muted-foreground">
                Në pritje të miratimit final nga administratori ISHMT.
              </p>
            )}
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
  installers,
  certifiers,
  installerName,
  certifierName,
  canEditOwnerFields,
  documentsSlot,
  installerDocsSlot,
  certifierDocsSlot,
  blockSubmit,
  dossierSections,
  submissionChecklist,
}: {
  applicationId: string;
  phase: RegistrationPhase;
  status: ApplicationStatus;
  returnToRole?: string | null;
  returnToRoles?: ReturnTargetRole[];
  returnReason?: string | null;
  requiredCorrection?: string | null;
  data: AppData | null;
  municipalities: { id: string; nameSq: string; code?: string | null; legacyRegistryCode?: string | null }[];
  adminUnits: { id: string; nameSq: string }[];
  installers: { id: string; name: string }[];
  certifiers: { id: string; name: string }[];
  installerName?: string | null;
  certifierName?: string | null;
  canEditOwnerFields: boolean;
  documentsSlot?: React.ReactNode;
  installerDocsSlot?: React.ReactNode;
  certifierDocsSlot?: React.ReactNode;
  blockSubmit?: string | null;
  dossierSections?: DossierSection[];
  submissionChecklist?: { key: string; label: string; ok: boolean }[];
}) {
  const resolvedReturnRoles =
    returnToRoles.length > 0
      ? returnToRoles
      : returnToRole
        ? [returnToRole as ReturnTargetRole]
        : [];

  const showPostSubmit =
    ["submitted", "review", "completed"].includes(phase) ||
    status === ApplicationStatus.PENDING_CHIEF_INSPECTOR;

  return (
    <div className="space-y-4">
      <RegistrationWizardProgress phase={phase} />

      {returnReason && (
        <AlertPanel variant="warning" title="Korrigjim i kërkuar" icon={RotateCcw}>
          <p>{returnReason}</p>
          {requiredCorrection && <p className="mt-1"><strong>Çfarë duhet bërë:</strong> {requiredCorrection}</p>}
          {status === ApplicationStatus.PENDING_OWNER_SUBMISSION && (
            <p className="mt-2 font-medium text-emerald-800">Riparashtroni aplikimin kur të jeni gati.</p>
          )}
          {status === ApplicationStatus.RETURNED && resolvedReturnRoles.length > 0 && (
            <p className="mt-2 text-sm">
              Palët: {resolvedReturnRoles.map((r) => RETURN_TARGET_LABELS[r]).join(", ")}
            </p>
          )}
        </AlertPanel>
      )}

      {showPostSubmit && <PostSubmitPanel status={status} phase={phase} />}

      {phase === "rejected" && (
        <AlertPanel variant="danger" title="Aplikimi u refuzua" icon={AlertTriangle}>
          Ky aplikim u refuzua nga ISHMT dhe nuk mund të vazhdojë.
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
                    adminUnits={adminUnits}
                    defaults={buildRegistrationFormDefaults(data)}
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
                <AssignInstallerFormWrapper applicationId={applicationId} installers={installers} />
              </>
            )}

            {phase === "wait-installer" && (
              <RegistrationWaitingPanel companyName={installerName} roleLabel="instaluesit" />
            )}

            {phase === "select-certifier" && (
              <>
                <DemoStepFillButton applicationId={applicationId} step="owner-assign-certifier" className="mb-4" />
                <AssignCertifierFormWrapper applicationId={applicationId} certifiers={certifiers} />
              </>
            )}

            {phase === "wait-certifier" && (
              <RegistrationWaitingPanel companyName={certifierName} roleLabel="certifikuesit" />
            )}

            {phase === "final-review" && dossierSections && submissionChecklist && data && (
              <RegistrationPreSubmitReview
                applicationId={applicationId}
                status={status}
                sections={dossierSections}
                installerDocsSlot={installerDocsSlot}
                certifierDocsSlot={certifierDocsSlot}
                checklist={submissionChecklist}
                blockSubmit={blockSubmit}
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

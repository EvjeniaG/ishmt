import Link from "next/link";
import {
  ApplicationElevatorSummary,
  ApplicationWorkflowLayout,
  ApplicationWorkflowSection,
  type WorkflowStep,
} from "@/components/applications/application-workflow-layout";
import { ApplicationDemoButton } from "@/components/demo/application-demo-button";
import { FieldChangeForm } from "@/components/lifecycle/field-change-form";
import { UpdateTypeForm } from "@/components/lifecycle/update-type-form";
import { DATA_UPDATE_SUBTYPE_LABELS } from "@/lib/constants/application-type-guide";
import { ApplicationStatus, ApplicationType } from "@prisma/client";

type ElevatorDefaults = Record<string, string>;

export function DataUpdateApplicationView({
  applicationId,
  status,
  returnReason,
  requiredCorrection,
  updateType,
  elevatorRegistry,
  elevatorAddress,
  ownerName,
  ownerNipt,
  elevatorDefaults,
  existingChanges,
  excludeElevatorId,
  maintenanceCompanies,
  suggestedFieldValues,
}: {
  applicationId: string;
  status: ApplicationStatus;
  returnReason?: string | null;
  requiredCorrection?: string | null;
  updateType?: string | null;
  elevatorRegistry: string;
  elevatorAddress?: string | null;
  ownerName: string;
  ownerNipt?: string | null;
  elevatorDefaults: ElevatorDefaults;
  existingChanges: unknown[];
  excludeElevatorId: string;
  maintenanceCompanies: { id: string; name: string }[];
  suggestedFieldValues?: Record<string, string | undefined>;
}) {
  const hasType = Boolean(updateType);
  const hasChanges = existingChanges.length > 0;
  const editable = status === ApplicationStatus.DRAFT || status === ApplicationStatus.RETURNED;

  const steps: WorkflowStep[] = [
    { key: "elevator", label: "Ashensori", done: true },
    { key: "type", label: "Lloji", done: hasType, active: editable && !hasType },
    { key: "changes", label: "Ndryshimet", done: hasChanges, active: editable && hasType && !hasChanges },
    { key: "docs", label: "Dokumentet", active: hasChanges && editable },
    { key: "submit", label: "Parashtrimi", active: hasChanges && editable },
  ];

  return (
    <ApplicationWorkflowLayout steps={steps}>
      <ApplicationWorkflowSection title="Ashensori">
        <ApplicationElevatorSummary
          registryNumber={elevatorRegistry}
          address={elevatorAddress}
          ownerName={ownerName}
          ownerNipt={ownerNipt}
        />
      </ApplicationWorkflowSection>

      {editable && (
        <>
          <ApplicationWorkflowSection
            title="Lloji i ndryshimit"
            headerExtra={
              <ApplicationDemoButton
                applicationId={applicationId}
                type={ApplicationType.DATA_UPDATE}
                status={status}
                updateType={updateType}
                hasUpdateType={hasType}
                hasChanges={hasChanges}
              />
            }
          >
            <UpdateTypeForm applicationId={applicationId} currentType={updateType} />
            <p className="text-xs font-medium text-muted-foreground">
              Për ndryshim të personit përgjegjës të ashensorit →{" "}
              <Link href="/portal/applications/new/ownership-transfer" className="font-semibold text-gov-primary hover:underline">
                Transferim pronësie
              </Link>
            </p>
          </ApplicationWorkflowSection>

          {hasType && (
            <ApplicationWorkflowSection
              title="Ndryshimet"
              description={
                updateType && updateType in DATA_UPDATE_SUBTYPE_LABELS
                  ? DATA_UPDATE_SUBTYPE_LABELS[updateType as keyof typeof DATA_UPDATE_SUBTYPE_LABELS]
                  : undefined
              }
              headerExtra={
                <ApplicationDemoButton
                  applicationId={applicationId}
                  type={ApplicationType.DATA_UPDATE}
                  status={status}
                  updateType={updateType}
                  hasUpdateType={hasType}
                  hasChanges={hasChanges}
                />
              }
            >
              <FieldChangeForm
                applicationId={applicationId}
                mode="update"
                updateType={updateType}
                maintenanceCompanies={maintenanceCompanies}
                excludeElevatorId={excludeElevatorId}
                elevatorDefaults={elevatorDefaults}
                existingChanges={existingChanges as never[]}
                suggestedValues={suggestedFieldValues}
              />
            </ApplicationWorkflowSection>
          )}
        </>
      )}

      {!editable && (
        <ApplicationWorkflowSection title="Përmbledhje">
          {updateType && (
            <p className="text-sm font-medium">
              {DATA_UPDATE_SUBTYPE_LABELS[updateType as keyof typeof DATA_UPDATE_SUBTYPE_LABELS] ?? updateType}
            </p>
          )}
        </ApplicationWorkflowSection>
      )}
    </ApplicationWorkflowLayout>
  );
}

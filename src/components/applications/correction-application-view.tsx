"use client";

import {
  ApplicationElevatorSummary,
  ApplicationWorkflowLayout,
  ApplicationWorkflowSection,
  type WorkflowStep,
} from "@/components/applications/application-workflow-layout";
import { ApplicationDemoButton } from "@/components/demo/application-demo-button";
import { FieldChangeForm } from "@/components/lifecycle/field-change-form";
import { ApplicationStatus, ApplicationType } from "@prisma/client";

type ElevatorDefaults = Record<string, string>;

export function CorrectionApplicationView({
  applicationId,
  status,
  returnReason,
  requiredCorrection,
  elevatorRegistry,
  elevatorAddress,
  ownerName,
  ownerNipt,
  elevatorDefaults,
  existingChanges,
  excludeElevatorId,
  suggestedFieldValues,
}: {
  applicationId: string;
  status: ApplicationStatus;
  returnReason?: string | null;
  requiredCorrection?: string | null;
  elevatorRegistry: string;
  elevatorAddress?: string | null;
  ownerName: string;
  ownerNipt?: string | null;
  elevatorDefaults: ElevatorDefaults;
  existingChanges: unknown[];
  excludeElevatorId: string;
  suggestedFieldValues?: Record<string, string | undefined>;
}) {
  const hasChanges = existingChanges.length > 0;
  const editable = status === ApplicationStatus.DRAFT || status === ApplicationStatus.RETURNED;

  const steps: WorkflowStep[] = [
    { key: "elevator", label: "Ashensori", done: true },
    { key: "changes", label: "Korrigjimet", done: hasChanges, active: editable && !hasChanges },
    { key: "submit", label: "Parashtrimi", done: false, active: hasChanges && editable },
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
        <ApplicationWorkflowSection
          title="Korrigjimet"
          description="Specifikoni fushat e gabuara dhe vlerat e sakta"
          headerExtra={
            <ApplicationDemoButton
              applicationId={applicationId}
              type={ApplicationType.DATA_CORRECTION}
              status={status}
              hasChanges={hasChanges}
            />
          }
        >
          <FieldChangeForm
            applicationId={applicationId}
            mode="correction"
            excludeElevatorId={excludeElevatorId}
            elevatorDefaults={elevatorDefaults}
            existingChanges={existingChanges as never[]}
            suggestedValues={suggestedFieldValues}
          />
          {hasChanges && (
            <p className="mt-4 text-sm text-muted-foreground">
              Kërkesa për ndryshim dhe arsyet regjistrohen në sistem me korrigjimet e specifikuara.
              Certifikata aktive CR referohet automatikisht - nuk kërkohet ngarkim shkrimi.
            </p>
          )}
        </ApplicationWorkflowSection>
      )}

      {!editable && hasChanges && (
        <ApplicationWorkflowSection title="Korrigjimet e specifikuara">
          <ul className="space-y-2 text-sm">
            {(existingChanges as { label: string; oldValue: string; newValue: string; reason?: string }[]).map(
              (c) => (
                <li key={c.label} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="font-medium">{c.label}</p>
                  <p className="text-muted-foreground">{c.oldValue} → {c.newValue}</p>
                  {c.reason && <p className="mt-1 text-xs text-muted-foreground">{c.reason}</p>}
                </li>
              ),
            )}
          </ul>
        </ApplicationWorkflowSection>
      )}
    </ApplicationWorkflowLayout>
  );
}

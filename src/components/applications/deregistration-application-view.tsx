import {
  ApplicationElevatorSummary,
  ApplicationReturnBanner,
  ApplicationWorkflowLayout,
  ApplicationWorkflowSection,
  type WorkflowStep,
} from "@/components/applications/application-workflow-layout";
import { ApplicationDemoButton } from "@/components/demo/application-demo-button";
import { DEREGISTRATION_REASON_LABELS } from "@/lib/constants/lifecycle-labels";
import { ApplicationStatus, ApplicationType } from "@prisma/client";

export function DeregistrationApplicationView({
  applicationId,
  status,
  returnReason,
  requiredCorrection,
  elevatorRegistry,
  elevatorAddress,
  ownerName,
  ownerNipt,
  reasonType,
  reasonText,
}: {
  applicationId: string;
  status: ApplicationStatus;
  returnReason?: string | null;
  requiredCorrection?: string | null;
  elevatorRegistry: string;
  elevatorAddress?: string | null;
  ownerName: string;
  ownerNipt?: string | null;
  reasonType?: string | null;
  reasonText?: string | null;
}) {
  const hasReason = Boolean(reasonType && reasonText?.trim());
  const editable = status === ApplicationStatus.DRAFT || status === ApplicationStatus.RETURNED;

  const steps: WorkflowStep[] = [
    { key: "elevator", label: "Ashensori", done: true },
    { key: "reason", label: "Arsyeja", done: hasReason },
    { key: "docs", label: "Dokumentet", active: hasReason && editable },
    { key: "submit", label: "Parashtrimi", active: hasReason && editable },
  ];

  return (
    <ApplicationWorkflowLayout steps={steps}>
      <ApplicationReturnBanner returnReason={returnReason} requiredCorrection={requiredCorrection} />

      <ApplicationWorkflowSection title="Ashensori" description="Ashensori që do të çregjistrohet">
        <ApplicationElevatorSummary
          registryNumber={elevatorRegistry}
          address={elevatorAddress}
          ownerName={ownerName}
          ownerNipt={ownerNipt}
        />
      </ApplicationWorkflowSection>

      <ApplicationWorkflowSection
        title="Arsyeja"
        headerExtra={
          editable && !hasReason ? (
            <ApplicationDemoButton
              applicationId={applicationId}
              type={ApplicationType.DEREGISTRATION}
              status={status}
              hasReason={hasReason}
            />
          ) : null
        }
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lloji</dt>
            <dd className="mt-0.5 font-medium">{reasonType ? (DEREGISTRATION_REASON_LABELS[reasonType] ?? reasonType) : "-"}</dd>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 sm:col-span-2">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Shpjegim</dt>
            <dd className="mt-0.5 whitespace-pre-wrap font-medium">{reasonText ?? "-"}</dd>
          </div>
        </dl>
      </ApplicationWorkflowSection>
    </ApplicationWorkflowLayout>
  );
}

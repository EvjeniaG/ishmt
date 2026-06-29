import {
  ApplicationElevatorSummary,
  ApplicationReturnBanner,
  ApplicationWorkflowLayout,
  ApplicationWorkflowSection,
  type WorkflowStep,
} from "@/components/applications/application-workflow-layout";
import { ApplicationDemoButton } from "@/components/demo/application-demo-button";
import { OwnershipTransferPanel } from "@/components/lifecycle/ownership-transfer-panel";
import { OwnershipTransferResponse } from "@/components/lifecycle/ownership-transfer-response";
import { ApplicationStatus, ApplicationType, DelegationStatus } from "@prisma/client";

export function OwnershipTransferApplicationView({
  applicationId,
  applicationNumber,
  status,
  returnReason,
  requiredCorrection,
  elevatorRegistry,
  elevatorAddress,
  ownerName,
  ownerNipt,
  targetNipt,
  targetName,
  delegationStatus,
  isSender,
  isRecipient,
  recipientPending,
  canInvite,
}: {
  applicationId: string;
  applicationNumber: string;
  status: ApplicationStatus;
  returnReason?: string | null;
  requiredCorrection?: string | null;
  elevatorRegistry: string;
  elevatorAddress?: string | null;
  ownerName: string;
  ownerNipt?: string | null;
  targetNipt?: string | null;
  targetName?: string | null;
  delegationStatus?: DelegationStatus | null;
  isSender: boolean;
  isRecipient: boolean;
  recipientPending: boolean;
  canInvite: boolean;
}) {
  const invited =
    delegationStatus === DelegationStatus.INVITED ||
    delegationStatus === DelegationStatus.PENDING;
  const accepted = delegationStatus === DelegationStatus.ACCEPTED;

  const steps: WorkflowStep[] = isRecipient
    ? [
        { key: "invite", label: "Ftesa", done: true },
        { key: "response", label: "Përgjigjja", active: recipientPending, done: !recipientPending },
      ]
    : [
        { key: "elevator", label: "Ashensori", done: true },
        { key: "invite", label: "Ftesa marrësit", done: invited || accepted, active: canInvite },
        { key: "accept", label: "Pranimi", done: accepted, active: invited && !accepted },
        { key: "docs", label: "Dokumentet", active: accepted },
        { key: "submit", label: "Parashtrimi", active: accepted },
      ];

  return (
    <ApplicationWorkflowLayout steps={steps}>
      <ApplicationReturnBanner returnReason={returnReason} requiredCorrection={requiredCorrection} />

      <ApplicationWorkflowSection title="Ashensori">
        <ApplicationElevatorSummary
          registryNumber={elevatorRegistry}
          address={elevatorAddress}
          ownerName={ownerName}
          ownerNipt={ownerNipt}
        />
      </ApplicationWorkflowSection>

      {isRecipient && recipientPending && (
        <OwnershipTransferResponse
          applicationId={applicationId}
          applicationNumber={applicationNumber}
          senderName={ownerName}
          elevatorLabel={elevatorRegistry}
          elevatorAddress={elevatorAddress}
        />
      )}

      {isSender && (
        <ApplicationWorkflowSection
          title="Marrësi i ri"
          headerExtra={
            canInvite ? (
              <ApplicationDemoButton
                applicationId={applicationId}
                type={ApplicationType.DATA_UPDATE}
                status={status}
                updateType="OWNERSHIP_TRANSFER"
                canInviteRecipient={canInvite}
              />
            ) : null
          }
        >
          <OwnershipTransferPanel
            applicationId={applicationId}
            elevatorLabel={elevatorRegistry}
            currentOwnerName={ownerName}
            currentOwnerNipt={ownerNipt}
            targetNipt={targetNipt}
            targetName={targetName}
            delegationStatus={delegationStatus}
            canInvite={canInvite}
          />
        </ApplicationWorkflowSection>
      )}
    </ApplicationWorkflowLayout>
  );
}

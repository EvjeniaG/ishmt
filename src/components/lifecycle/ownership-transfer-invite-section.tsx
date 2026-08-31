"use client";

import { useCallback, useState } from "react";
import { ApplicationStatus, ApplicationType, DelegationStatus } from "@prisma/client";
import { ApplicationWorkflowSection } from "@/components/applications/application-workflow-layout";
import { ApplicationDemoButton } from "@/components/demo/application-demo-button";
import { OwnershipTransferPanel } from "@/components/lifecycle/ownership-transfer-panel";

export type OwnershipTransferPrefill = {
  nipt: string;
  reason: string;
};

export function OwnershipTransferInviteSection({
  applicationId,
  status,
  canInvite,
  elevatorLabel,
  currentOwnerName,
  currentOwnerNipt,
  targetNipt,
  targetName,
  delegationStatus,
}: {
  applicationId: string;
  status: ApplicationStatus;
  canInvite: boolean;
  elevatorLabel: string;
  currentOwnerName: string;
  currentOwnerNipt?: string | null;
  targetNipt?: string | null;
  targetName?: string | null;
  delegationStatus?: DelegationStatus | null;
}) {
  const [demoPrefill, setDemoPrefill] = useState<OwnershipTransferPrefill | null>(null);
  const clearDemoPrefill = useCallback(() => setDemoPrefill(null), []);

  return (
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
            onOwnershipPrefill={setDemoPrefill}
          />
        ) : null
      }
    >
      <OwnershipTransferPanel
        applicationId={applicationId}
        elevatorLabel={elevatorLabel}
        currentOwnerName={currentOwnerName}
        currentOwnerNipt={currentOwnerNipt}
        targetNipt={targetNipt}
        targetName={targetName}
        delegationStatus={delegationStatus}
        canInvite={canInvite}
        demoPrefill={demoPrefill}
        onDemoPrefillApplied={clearDemoPrefill}
      />
    </ApplicationWorkflowSection>
  );
}

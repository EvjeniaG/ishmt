import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  ApplicationElevatorSummary,
  ApplicationWorkflowSection,
} from "@/components/applications/application-workflow-layout";
import { OwnershipTransferInviteSection } from "@/components/lifecycle/ownership-transfer-invite-section";
import { OwnershipTransferResponse } from "@/components/lifecycle/ownership-transfer-response";
import { Button } from "@/components/ui/button";
import { ApplicationStatus, DelegationStatus } from "@prisma/client";

function isOwnershipTransferApproved(status: ApplicationStatus) {
  return (
    status === ApplicationStatus.APPROVED ||
    status === ApplicationStatus.ELEVATOR_CREATED ||
    status === ApplicationStatus.ASSETS_GENERATED ||
    status === ApplicationStatus.CLOSED
  );
}

function OwnershipTransferSummary({
  previousOwnerName,
  previousOwnerNipt,
  newOwnerName,
  newOwnerNipt,
  transferReason,
}: {
  previousOwnerName: string;
  previousOwnerNipt?: string | null;
  newOwnerName?: string | null;
  newOwnerNipt?: string | null;
  transferReason?: string | null;
}) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Personi përgjegjës i vjetër
        </dt>
        <dd className="mt-0.5 font-medium">
          {previousOwnerName}
          {previousOwnerNipt ? ` · ${previousOwnerNipt}` : ""}
        </dd>
      </div>
      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Marrësi i ri
        </dt>
        <dd className="mt-0.5 font-medium">
          {newOwnerName ?? "-"}
          {newOwnerNipt ? ` · ${newOwnerNipt}` : ""}
        </dd>
      </div>
      {transferReason ? (
        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 sm:col-span-2">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Arsyeja e transferimit
          </dt>
          <dd className="mt-0.5 whitespace-pre-wrap font-medium">{transferReason}</dd>
        </div>
      ) : null}
    </dl>
  );
}

export function OwnershipTransferApplicationView({
  applicationId,
  applicationNumber,
  status,
  elevatorRegistry,
  elevatorAddress,
  elevatorId,
  previousOwnerName,
  previousOwnerNipt,
  currentOwnerName,
  currentOwnerNipt,
  newOwnerName,
  newOwnerNipt,
  targetNipt,
  targetName,
  transferReason,
  delegationStatus,
  isSender,
  isRecipient,
  recipientPending,
  canInvite,
}: {
  applicationId: string;
  applicationNumber: string;
  status: ApplicationStatus;
  elevatorRegistry: string;
  elevatorAddress?: string | null;
  elevatorId?: string | null;
  previousOwnerName: string;
  previousOwnerNipt?: string | null;
  currentOwnerName: string;
  currentOwnerNipt?: string | null;
  newOwnerName?: string | null;
  newOwnerNipt?: string | null;
  targetNipt?: string | null;
  targetName?: string | null;
  transferReason?: string | null;
  delegationStatus?: DelegationStatus | null;
  isSender: boolean;
  isRecipient: boolean;
  recipientPending: boolean;
  canInvite: boolean;
}) {
  const editable = status === ApplicationStatus.DRAFT || status === ApplicationStatus.RETURNED;
  const approved = isOwnershipTransferApproved(status);
  const recipientLabel = newOwnerName ?? targetName ?? targetNipt ?? "-";

  return (
    <div className="space-y-4">
      <ApplicationWorkflowSection title="Ashensori">
        <ApplicationElevatorSummary
          registryNumber={elevatorRegistry}
          address={elevatorAddress}
          ownerName={currentOwnerName}
          ownerNipt={currentOwnerNipt}
        />
      </ApplicationWorkflowSection>

      {approved && (
        <ApplicationWorkflowSection
          title="Transferimi u krye"
          headerExtra={
            <span className="workflow-status-done shrink-0">
              <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Miratuar
            </span>
          }
        >
          <div className="space-y-4">
            <OwnershipTransferSummary
              previousOwnerName={previousOwnerName}
              previousOwnerNipt={previousOwnerNipt}
              newOwnerName={newOwnerName}
              newOwnerNipt={newOwnerNipt}
              transferReason={transferReason}
            />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isRecipient
                ? `Ashensori ${elevatorRegistry} tani është nën përgjegjësinë tuaj si person i ri përgjegjës.`
                : isSender
                  ? `Pronësia u transferua te ${recipientLabel}. Kartela e regjistrit u përditësua nga IQMT.`
                  : "IQMT miratoi transferimin e pronësisë. Kartela e ashensorit u përditësua."}
            </p>
            {isRecipient && elevatorId ? (
              <Button asChild variant="outline" className="rounded-lg">
                <Link href={`/portal/elevators/${elevatorId}`}>Shiko ashensorin</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="rounded-lg">
                <Link href="/portal/applications">Kthehu te aplikimet</Link>
              </Button>
            )}
          </div>
        </ApplicationWorkflowSection>
      )}

      {!approved && !editable && (
        <ApplicationWorkflowSection title="Marrësi i ri">
          <OwnershipTransferSummary
            previousOwnerName={previousOwnerName}
            previousOwnerNipt={previousOwnerNipt}
            newOwnerName={newOwnerName ?? targetName}
            newOwnerNipt={newOwnerNipt ?? targetNipt}
            transferReason={transferReason}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Aplikimi {applicationNumber} po shqyrtohet nga IQMT. Do të njoftoheni kur të merret vendimi final.
          </p>
        </ApplicationWorkflowSection>
      )}

      {isRecipient && recipientPending && (
        <OwnershipTransferResponse
          applicationId={applicationId}
          applicationNumber={applicationNumber}
          senderName={previousOwnerName}
          elevatorLabel={elevatorRegistry}
          elevatorAddress={elevatorAddress}
        />
      )}

      {editable && isSender && (
        <OwnershipTransferInviteSection
          applicationId={applicationId}
          status={status}
          canInvite={canInvite}
          elevatorLabel={elevatorRegistry}
          currentOwnerName={previousOwnerName}
          currentOwnerNipt={previousOwnerNipt}
          targetNipt={targetNipt}
          targetName={targetName}
          delegationStatus={delegationStatus}
        />
      )}
    </div>
  );
}

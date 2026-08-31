"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useState } from "react";
import { DelegationStatus } from "@prisma/client";
import { inviteOwnershipRecipientAction } from "@/lib/actions/ownership-transfer-actions";
import { revokeOwnershipDelegationAction } from "@/lib/actions/delegation-actions";
import { DELEGATION_STATUS_LABELS } from "@/lib/constants/display-labels";
import { RevokeDelegationForm } from "@/components/delegation/revoke-delegation-form";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OwnershipTransferPrefill } from "@/components/lifecycle/ownership-transfer-invite-section";

const INVITE_STATUS_LABELS: Partial<Record<DelegationStatus, string>> = {
  PENDING: "Në pritje",
  INVITED: "Ftesa u dërgua - prit përgjigjen e marrësit",
  ACCEPTED: "Marrësi pranoi - mund të parashtrosh te IQMT",
  REJECTED: "Marrësi refuzoi - zgjidh marrës tjetër",
};

export function OwnershipTransferPanel({
  applicationId,
  elevatorLabel,
  currentOwnerName,
  currentOwnerNipt,
  targetNipt,
  targetName,
  delegationStatus,
  canInvite,
  demoPrefill,
  onDemoPrefillApplied,
}: {
  applicationId: string;
  elevatorLabel: string;
  currentOwnerName: string;
  currentOwnerNipt?: string | null;
  targetNipt?: string | null;
  targetName?: string | null;
  delegationStatus?: DelegationStatus | null;
  canInvite: boolean;
  demoPrefill?: OwnershipTransferPrefill | null;
  onDemoPrefillApplied?: () => void;
}) {
  const router = useRouter();
  const [nipt, setNipt] = useState(targetNipt ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!demoPrefill) return;
    setNipt(demoPrefill.nipt.toUpperCase());
    setReason(demoPrefill.reason);
    setError(null);
    onDemoPrefillApplied?.();
  }, [demoPrefill, onDemoPrefillApplied]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await inviteOwnershipRecipientAction(applicationId, nipt, reason);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const statusLabel = delegationStatus
    ? INVITE_STATUS_LABELS[delegationStatus] ?? DELEGATION_STATUS_LABELS[delegationStatus]
    : null;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p><strong>Personi përgjegjës aktual i ashensorit:</strong> {currentOwnerName}{currentOwnerNipt ? ` (${currentOwnerNipt})` : ""}</p>
        {delegationStatus && statusLabel && (
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <strong>Statusi i ftesës:</strong>
            <WorkflowStatusChip
              label={statusLabel}
              tone={
                delegationStatus === DelegationStatus.ACCEPTED
                  ? "done"
                  : delegationStatus === DelegationStatus.REJECTED
                    ? "danger"
                    : "waiting"
              }
            />
          </p>
        )}
      </div>

      {canInvite && (
        <form onSubmit={sendInvite} className="grid max-w-lg gap-3">
          <div className="space-y-1">
            <Label htmlFor="recipient-nipt">NIPT/NID i marrësit *</Label>
            <Input
              id="recipient-nipt"
              value={nipt}
              onChange={(e) => setNipt(e.target.value.toUpperCase())}
              placeholder="p.sh. K12345678A"
              required
            />
            <p className="text-xs text-muted-foreground">
              Marrësi duhet të jetë i regjistruar në sistem si subjekt i personit përgjegjës të ashensorit.
              Përdorni NIPT-in e subjektit (p.sh. L6040406A) ose Numrin Personal të përdoruesit (p.sh. I90404006F).
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="transfer-reason">Arsyeja e transferimit *</Label>
            <textarea
              id="transfer-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
              placeholder="P.sh. shitje e pronës, ndryshim administratori, bashkim/shkrirje shoqërie"
              required
              minLength={10}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Duke dërguar…" : delegationStatus === "REJECTED" ? "Dërgo te marrës i ri" : "Dërgo ftesën"}
          </Button>
        </form>
      )}

      {delegationStatus === DelegationStatus.INVITED && !canInvite && (
        <div className="space-y-3">
          <p className="text-sm text-amber-700">
            Ftesa u dërgua te <strong>{targetName ?? targetNipt}</strong>. Nuk mund të parashtrosh te IQMT derisa marrësi të pranojë.
          </p>
          <RevokeDelegationForm
            label="Arsyeja e tërheqjes së ftesës"
            hint="Mund ta tërhiqni ftesën dhe të dërgoni te marrës tjetër."
            onRevoke={(reason) => revokeOwnershipDelegationAction(applicationId, reason)}
          />
        </div>
      )}
      {delegationStatus === DelegationStatus.ACCEPTED && (
        <p className="text-sm text-green-700">
          Marrësi pranoi transferimin. Parashtro aplikimin te IQMT më poshtë.
        </p>
      )}
    </div>
  );
}

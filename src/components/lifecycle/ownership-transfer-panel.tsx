"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DelegationStatus } from "@prisma/client";
import { inviteOwnershipRecipientAction } from "@/lib/actions/ownership-transfer-actions";
import { DELEGATION_STATUS_LABELS } from "@/lib/constants/display-labels";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import type { StatusTone } from "@/lib/registration/status-presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INVITE_STATUS_LABELS: Partial<Record<DelegationStatus, string>> = {
  PENDING: "Në pritje",
  INVITED: "Ftesa u dërgua - prit përgjigjen e marrësit",
  ACCEPTED: "Marrësi pranoi - mund të parashtrosh te ISHMT",
  REJECTED: "Marrësi refuzoi - zgjidh marrës tjetër",
};

export function OwnershipTransferPanel({
  applicationId,
  currentOwnerName,
  currentOwnerNipt,
  targetNipt,
  targetName,
  delegationStatus,
  canInvite,
}: {
  applicationId: string;
  elevatorLabel: string;
  currentOwnerName: string;
  currentOwnerNipt?: string | null;
  targetNipt?: string | null;
  targetName?: string | null;
  delegationStatus?: DelegationStatus | null;
  canInvite: boolean;
}) {
  const router = useRouter();
  const [nipt, setNipt] = useState(targetNipt ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        {targetName && (
          <p className="mt-1">
            <strong>Marrësi i synuar:</strong> {targetName}{targetNipt ? ` (${targetNipt})` : ""}
          </p>
        )}
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
            <p className="text-xs text-muted-foreground">Marrësi duhet të jetë i regjistruar në sistem si subjekt i personit përgjegjës të ashensorit.</p>
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

      {delegationStatus === "INVITED" && !canInvite && (
        <p className="text-sm text-amber-700">
          Ftesa u dërgua te <strong>{targetName ?? targetNipt}</strong>. Nuk mund të parashtrosh te ISHMT derisa marrësi të pranojë.
        </p>
      )}
      {delegationStatus === "ACCEPTED" && (
        <p className="text-sm text-green-700">
          Marrësi pranoi transferimin. Vazhdo poshtë - ngarko dokumentet dhe parashtro te ISHMT.
        </p>
      )}
    </div>
  );
}

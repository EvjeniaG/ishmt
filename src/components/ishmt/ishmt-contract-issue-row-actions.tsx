"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { notifyOwnerForContractIssueAction } from "@/lib/actions/ishmt-contract-actions";
import type { IshmtContractIssueRow } from "@/lib/services/ishmt-contract-monitor-service";
import { formatDateTimeSq } from "@/lib/format-date";
import { buildAlreadyNotifiedMessage } from "@/lib/ishmt/compliance-notify-feedback";
import { Button } from "@/components/ui/button";

export function IshmtContractIssueRowActions({ row }: { row: IshmtContractIssueRow }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    { kind: "sent"; at: string } | { kind: "already"; at: string | null } | null
  >(null);

  async function notify() {
    setBusy(true);
    const result = await notifyOwnerForContractIssueAction({
      ownerOrgId: row.ownerOrgId,
      maintenanceOrgId: row.maintenanceOrgId,
      certifierOrgId: row.certifierOrgId,
      elevatorId: row.elevatorId,
      issueType: row.issueType,
      issueLabel: row.issueLabel,
      registryNumber: row.registryNumber,
      dueDate: row.dueDate?.toISOString() ?? null,
    });
    setBusy(false);
    if (!result.success) return;

    if (result.created > 0) {
      setStatus({ kind: "sent", at: result.sentAt ?? new Date().toISOString() });
      return;
    }

    setStatus({ kind: "already", at: result.lastSentAt });
  }

  const buttonLabel = busy
    ? "…"
    : status?.kind === "sent"
      ? "U dërgua tani"
      : status?.kind === "already"
        ? "Njoftuar"
        : "Njofto palët";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Link href={`/portal/elevators/${row.elevatorId}`} className="portal-table-link whitespace-nowrap">
        Dosja
      </Link>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={
          status?.kind === "sent"
            ? "h-7 rounded-md px-2 text-[11px] text-emerald-700"
            : status?.kind === "already"
              ? "h-7 rounded-md px-2 text-[11px] text-amber-700"
              : "h-7 rounded-md px-2 text-[11px] text-gov-primary"
        }
        disabled={busy || status !== null}
        onClick={() => void notify()}
      >
        <Mail className="mr-1 h-3 w-3" aria-hidden />
        {buttonLabel}
      </Button>
      {status?.kind === "sent" && (
        <span className="text-[10px] text-emerald-700">{formatDateTimeSq(status.at)}</span>
      )}
      {status?.kind === "already" && status.at && (
        <span className="max-w-[12rem] text-right text-[10px] leading-snug text-amber-700">
          {buildAlreadyNotifiedMessage(status.at)}
        </span>
      )}
    </div>
  );
}

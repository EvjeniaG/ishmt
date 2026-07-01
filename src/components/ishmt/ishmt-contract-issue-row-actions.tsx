"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { notifyOwnerForContractIssueAction } from "@/lib/actions/ishmt-contract-actions";
import type { IshmtContractIssueRow } from "@/lib/services/ishmt-contract-monitor-service";
import { Button } from "@/components/ui/button";

export function IshmtContractIssueRowActions({ row }: { row: IshmtContractIssueRow }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function notify() {
    setBusy(true);
    const result = await notifyOwnerForContractIssueAction({
      ownerOrgId: row.ownerOrgId,
      elevatorId: row.elevatorId,
      issueType: row.issueType,
      issueLabel: row.issueLabel,
      registryNumber: row.registryNumber,
      dueDate: row.dueDate?.toISOString() ?? null,
    });
    setBusy(false);
    if (result.success) setDone(true);
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Link href={`/portal/elevators/${row.elevatorId}`} className="portal-table-link whitespace-nowrap">
        Dosja
      </Link>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 rounded-md px-2 text-[11px] text-gov-primary"
        disabled={busy || done}
        onClick={() => void notify()}
      >
        <Mail className="mr-1 h-3 w-3" aria-hidden />
        {done ? "U dërgua" : busy ? "…" : "Njofto"}
      </Button>
    </div>
  );
}

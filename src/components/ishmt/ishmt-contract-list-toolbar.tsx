"use client";

import { useState } from "react";
import { Download, Mail } from "lucide-react";
import { notifyFilteredContractOwnersAction } from "@/lib/actions/ishmt-contract-actions";
import { buildContractsExportHref } from "@/lib/ishmt/contract-issue-filters";
import type { ContractIssueListFilters } from "@/lib/ishmt/contract-issue-filters";
import {
  buildComplianceNotifyFeedback,
  notifyFeedbackToneClasses,
  type NotifyFeedbackTone,
} from "@/lib/ishmt/compliance-notify-feedback";
import { Button } from "@/components/ui/button";

export function IshmtContractListToolbar({
  filters,
  total,
  searchParams,
}: {
  filters: ContractIssueListFilters;
  total: number;
  searchParams: Record<string, string | undefined>;
}) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: NotifyFeedbackTone } | null>(
    null,
  );

  async function notifyFiltered() {
    setBusy(true);
    setFeedback(null);
    const result = await notifyFilteredContractOwnersAction(searchParams);
    setBusy(false);
    if (!result.success) {
      setFeedback({ message: result.error, tone: "warning" });
      return;
    }
    setFeedback(
      buildComplianceNotifyFeedback({
        ...result,
        contextLabel: "lista e filtruar",
      }),
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border/60 pb-4">
      {feedback && (
        <p
          className={`mr-auto rounded-md border px-3 py-2 text-xs ${notifyFeedbackToneClasses(feedback.tone)}`}
        >
          {feedback.message}
        </p>
      )}
      <Button asChild type="button" size="sm" variant="outline" className="h-9 rounded-lg text-xs">
        <a href={buildContractsExportHref(filters)}>
          <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Eksporto Excel
        </a>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 rounded-lg text-xs"
        disabled={busy || total === 0}
        onClick={() => void notifyFiltered()}
      >
        <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {busy ? "Duke dërguar…" : "Njofto palët e filtruara"}
      </Button>
    </div>
  );
}

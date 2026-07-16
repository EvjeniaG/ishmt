"use client";

import { useState } from "react";
import { Download, Mail } from "lucide-react";
import { notifyFilteredContractOwnersAction } from "@/lib/actions/ishmt-contract-actions";
import { buildContractsExportHref } from "@/lib/ishmt/contract-issue-filters";
import type { ContractIssueListFilters } from "@/lib/ishmt/contract-issue-filters";
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
  const [message, setMessage] = useState<string | null>(null);

  async function notifyFiltered() {
    setBusy(true);
    setMessage(null);
    const result = await notifyFilteredContractOwnersAction(searchParams);
    setBusy(false);
    if (!result.success) {
      setMessage(result.error);
      return;
    }
    setMessage(
      result.created > 0
        ? `${result.created} njoftime u dërguan te ${result.organizations} organizata.`
        : "Nuk u krijuan njoftime të reja (të dërguara së fundmi).",
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border/60 pb-4">
      {message && <p className="mr-auto text-xs text-muted-foreground">{message}</p>}
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

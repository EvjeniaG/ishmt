"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { recalculateComplianceAction } from "@/lib/actions/ishmt-admin-actions";
import { Button } from "@/components/ui/button";

export function ComplianceRecalcButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    if (!confirm("Rillogarit përputhshmërinë për të gjithë ashensorët?")) return;
    setBusy(true);
    setMessage(null);
    const result = await recalculateComplianceAction();
    setBusy(false);
    if (result.success && result.data) {
      setMessage(`U përpunuan ${result.data.processed} ashensorë.`);
      router.refresh();
    } else if (!result.success) {
      setMessage(result.error);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={run} disabled={busy} variant="outline">
        {busy ? "Duke llogaritur…" : "Rillogarit përputhshmërinë"}
      </Button>
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}

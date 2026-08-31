"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { prefillMaintenanceAssignmentDemoAction } from "@/lib/actions/owner-actions";
import { isDemoToolsEnabled } from "@/lib/demo/demo-data-mode";

export function MaintenanceAssignmentDemoButton({ className = "" }: { className?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  if (!isDemoToolsEnabled()) return null;

  async function onClick() {
    setLoading(true);
    setError(null);
    setHint(null);

    const result = await prefillMaintenanceAssignmentDemoAction();
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("ishmt:maintenance-demo-prefill", {
        detail: {
          query: result.query,
          startDate: result.startDate,
          endDate: result.endDate,
        },
      }),
    );
    setHint("U plotësua. Kontrolloni dhe dërgoni ftesën.");
  }

  return (
    <div className={className}>
      <button type="button" onClick={() => void onClick()} disabled={loading} className="workflow-demo-btn">
        <FlaskConical className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        {loading ? "Duke plotësuar…" : "Plotëso me të dhëna demo"}
      </button>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1.5 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

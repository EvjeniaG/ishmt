"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { fillApplicationDemoStepAction } from "@/lib/actions/demo-registration-actions";
import {
  APPLICATION_DEMO_STEP_LABELS,
  type ApplicationDemoStep,
} from "@/lib/demo/application-demo-steps";
import { isDemoToolsEnabled } from "@/lib/demo/demo-data-mode";

function applyOrgPrefill(
  field: "installerOrgId" | "certifierOrgId",
  orgId: string,
  query?: string,
) {
  if (field === "installerOrgId" || field === "certifierOrgId") {
    const select = document.querySelector(`select[name="${field}"]`) as HTMLSelectElement | null;
    if (select) {
      select.value = orgId;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return;
  }
}

export function DemoStepFillButton({
  applicationId,
  step,
  className = "",
  onOwnershipPrefill,
}: {
  applicationId: string;
  step: ApplicationDemoStep;
  className?: string;
  onOwnershipPrefill?: (prefill: { nipt: string; reason: string }) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  if (!isDemoToolsEnabled()) return null;

  async function onClick() {
    setLoading(true);
    setError(null);
    setHint(null);
    const result = await fillApplicationDemoStepAction(applicationId, step);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.prefilledOrgField && result.prefilledOrgId) {
      applyOrgPrefill(result.prefilledOrgField, result.prefilledOrgId, result.prefilledOrgQuery);
      setHint("U plotësua. Kontrolloni dhe vazhdoni.");
      return;
    }

    if (result.prefilledRecipientNipt && result.prefilledTransferReason) {
      onOwnershipPrefill?.({
        nipt: result.prefilledRecipientNipt,
        reason: result.prefilledTransferReason,
      });
      setHint("U plotësua. Kontrolloni dhe vazhdoni.");
      return;
    }

    if (result.refreshPage) {
      router.refresh();
      setHint("Të dhënat u plotësuan dhe u ruajtun.");
    }
  }

  return (
    <div className={className}>
      <button type="button" onClick={() => void onClick()} disabled={loading} className="workflow-demo-btn">
        <FlaskConical className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        {loading ? "Duke plotësuar…" : APPLICATION_DEMO_STEP_LABELS[step]}
      </button>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1.5 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { fillApplicationDemoStepAction } from "@/lib/actions/demo-registration-actions";
import {
  APPLICATION_DEMO_STEP_LABELS,
  type ApplicationDemoStep,
} from "@/lib/demo/application-demo-steps";
import { isDemoModeEnabled } from "@/lib/demo/demo-mode";

function applyOrgPrefill(field: "installerOrgId" | "certifierOrgId", orgId: string) {
  const select = document.querySelector(`select[name="${field}"]`) as HTMLSelectElement | null;
  if (select) {
    select.value = orgId;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function DemoStepFillButton({
  applicationId,
  step,
  className = "",
}: {
  applicationId: string;
  step: ApplicationDemoStep;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  if (!isDemoModeEnabled()) return null;

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
      applyOrgPrefill(result.prefilledOrgField, result.prefilledOrgId);
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

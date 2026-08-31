"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { AssetGenerationStatus } from "@prisma/client";
import { retryAssetGenerationAction } from "@/lib/actions/application-actions";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<AssetGenerationStatus, string> = {
  PENDING: "Në pritje",
  IN_PROGRESS: "Duke gjeneruar...",
  COMPLETED: "Përfunduar",
  FAILED: "Dështoi",
};

export function AssetGenerationStatusCard({
  applicationId,
  status,
  error,
}: {
  applicationId: string;
  status: AssetGenerationStatus;
  error?: string | null;
}) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function onRetry() {
    setRetrying(true);
    setRetryError(null);
    const result = await retryAssetGenerationAction(applicationId);
    if (!result.success) {
      setRetryError(result.error ?? "Riprovimi dështoi");
    } else {
      router.refresh();
    }
    setRetrying(false);
  }

  if (status === AssetGenerationStatus.COMPLETED) {
    return null;
  }

  return (
    <section className="workflow-section">
      <div className="workflow-section-header">
        <h2 className="workflow-section-title">Gjenerimi i dokumenteve</h2>
        <p className="workflow-section-desc">Certifikata dhe QR pas miratimit final</p>
      </div>
      <div className="workflow-section-body space-y-3 text-sm">
        <div className="workflow-data-cell">
          <p className="workflow-data-label">Statusi</p>
          <p className="workflow-data-value">{STATUS_LABELS[status]}</p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {retryError && <p className="text-sm text-destructive">{retryError}</p>}
        {status === AssetGenerationStatus.FAILED && (
          <Button type="button" onClick={onRetry} disabled={retrying}>
            {retrying ? "Duke riprovuar..." : "Riprovo gjenerimin"}
          </Button>
        )}
      </div>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AssetGenerationStatus } from "@prisma/client";
import { retryAssetGenerationAction } from "@/lib/actions/application-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle>Gjenerimi i dokumenteve</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <strong>Statusi:</strong> {STATUS_LABELS[status]}
        </p>
        {error && <p className="text-red-600">{error}</p>}
        {retryError && <p className="text-red-600">{retryError}</p>}
        {status === AssetGenerationStatus.FAILED && (
          <Button type="button" onClick={onRetry} disabled={retrying}>
            {retrying ? "Duke riprovuar..." : "Riprovo gjenerimin"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

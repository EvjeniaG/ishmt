"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { recordPhysicalVerificationAction } from "@/lib/actions/elevator-actions";
import { Button } from "@/components/ui/button";

export function PhysicalVerificationButton({ elevatorId }: { elevatorId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!window.confirm("Konfirmoni që verifikimi fizik në terren u krye?")) return;
    setBusy(true);
    setError(null);
    const result = await recordPhysicalVerificationAction(elevatorId);
    setBusy(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">Kërkohet verifikim fizik në terren</p>
      <p className="mt-1 text-xs text-amber-800">
        Inspektori duhet të konfirmojë pas vizitës në objekt.
      </p>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      <Button className="mt-3" size="sm" onClick={confirm} disabled={busy}>
        {busy ? "Duke regjistruar…" : "Konfirmo verifikimin fizik"}
      </Button>
    </div>
  );
}

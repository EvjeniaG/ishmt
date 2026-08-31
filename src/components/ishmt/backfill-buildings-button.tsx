"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { backfillBuildingsAction } from "@/lib/actions/ishmt-admin-actions";
import { Button } from "@/components/ui/button";

export function BackfillBuildingsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm("Lidh ashensorët ekzistues me entitetet e ndërtesave?")) return;
    setBusy(true);
    await backfillBuildingsAction();
    setBusy(false);
    router.refresh();
  }

  return (
    <Button onClick={run} disabled={busy} variant="outline">
      {busy ? "Duke lidhur…" : "Lidh ndërtesat (backfill)"}
    </Button>
  );
}

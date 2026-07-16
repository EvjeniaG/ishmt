"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignReportInspectorAction } from "@/lib/actions/citizen-report-actions";
import type { FieldInspectorOption } from "@/lib/services/ishmt-field-inspection-service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ReportAssignInspectorForm({
  reportId,
  inspectors,
  currentInspectorId,
}: {
  reportId: string;
  inspectors: FieldInspectorOption[];
  currentInspectorId: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const inspectorId = String(new FormData(e.currentTarget).get("inspectorId") ?? "");
    const result = await assignReportInspectorAction(reportId, inspectorId);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (inspectors.length === 0) {
    return <p className="text-sm text-muted-foreground">Nuk ka inspektorë terreni të disponueshëm.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <div className="space-y-1">
        <Label htmlFor="inspectorId">Inspektor terreni</Label>
        <select
          id="inspectorId"
          name="inspectorId"
          required
          defaultValue={currentInspectorId ?? ""}
          className="flex h-10 w-full rounded-md border px-3 text-sm"
        >
          <option value="" disabled>
            Zgjidhni inspektorin…
          </option>
          {inspectors.map((inspector) => (
            <option key={inspector.id} value={inspector.id}>
              {inspector.firstName} {inspector.lastName}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={busy}>
        {currentInspectorId ? "Ricakt inspektorin" : "Cakt inspektorin"}
      </Button>
      {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <p className="text-xs text-muted-foreground sm:col-span-2">
        Inspektori merr njoftim automatik në portal pas caktimit.
      </p>
    </form>
  );
}

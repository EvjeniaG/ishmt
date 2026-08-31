"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Pencil, UserRound } from "lucide-react";
import { assignReportInspectorAction } from "@/lib/actions/citizen-report-actions";
import type { FieldInspectorOption } from "@/lib/services/ishmt-field-inspection-service";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ReportAssignInspectorForm({
  reportId,
  inspectors,
  currentInspectorId,
  currentInspectorName,
}: {
  reportId: string;
  inspectors: FieldInspectorOption[];
  currentInspectorId: string | null;
  currentInspectorName: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editMode, setEditMode] = useState(!currentInspectorId);
  const [selectedInspectorId, setSelectedInspectorId] = useState(currentInspectorId ?? "");
  const [confirmed, setConfirmed] = useState(false);

  const isReassignment = Boolean(currentInspectorId);
  const selectedInspector = useMemo(
    () => inspectors.find((inspector) => inspector.id === selectedInspectorId) ?? null,
    [inspectors, selectedInspectorId],
  );
  const unchangedSelection = isReassignment && selectedInspectorId === currentInspectorId;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (unchangedSelection) {
      setError("Zgjidhni një inspektor tjetër ose anuloni ndryshimin.");
      return;
    }
    if (isReassignment && !confirmed) {
      setError("Konfirmoni ricaktimin para se të vazhdoni.");
      return;
    }

    setBusy(true);
    setError(null);
    const result = await assignReportInspectorAction(reportId, selectedInspectorId);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditMode(false);
    setConfirmed(false);
    router.refresh();
  }

  if (inspectors.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Nuk ka inspektorë terreni të disponueshëm për caktim.
      </p>
    );
  }

  if (currentInspectorId && currentInspectorName && !editMode) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-800">
              <UserRound className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/70">
                Inspektor i caktuar
              </p>
              <p className="mt-1 text-lg font-semibold text-gov-primary">{currentInspectorName}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                Inspektori merr njoftim në portal pas caktimit ose ricaktimit.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" className="shrink-0" onClick={() => setEditMode(true)}>
            <Pencil className="mr-2 h-4 w-4" aria-hidden />
            Ndrysho inspektorin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4 sm:p-5">
      <div className="space-y-1">
        <Label htmlFor="inspectorId">Inspektor terreni</Label>
        <select
          id="inspectorId"
          name="inspectorId"
          required
          value={selectedInspectorId}
          onChange={(e) => {
            setSelectedInspectorId(e.target.value);
            setConfirmed(false);
            setError(null);
          }}
          className="flex h-11 w-full rounded-md border bg-background px-3 text-sm"
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

      {isReassignment && selectedInspector && !unchangedSelection && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span>
            Konfirmoj ricaktimin e raportit te{" "}
            <strong>
              {selectedInspector.firstName} {selectedInspector.lastName}
            </strong>
            . Inspektori i ri do të njoftohet automatikisht në portal.
          </span>
        </label>
      )}

      {!isReassignment && selectedInspector && (
        <p className="text-sm text-muted-foreground">
          Pas caktimit, <strong>{selectedInspector.firstName} {selectedInspector.lastName}</strong>{" "}
          do të marrë njoftim në portal për hetimin e raportit.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          disabled={busy || !selectedInspectorId || unchangedSelection || (isReassignment && !confirmed)}
          className="bg-gov-primary hover:bg-gov-secondary"
        >
          {busy ? "Duke ruajtur…" : isReassignment ? "Konfirmo ricaktimin" : "Cakt inspektorin"}
        </Button>
        {isReassignment && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setEditMode(false);
              setSelectedInspectorId(currentInspectorId ?? "");
              setConfirmed(false);
              setError(null);
            }}
          >
            Anulo
          </Button>
        )}
      </div>
    </form>
  );
}

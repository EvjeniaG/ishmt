"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2, Search } from "lucide-react";
import { lookupCitizenReportStatusAction } from "@/lib/actions/citizen-report-actions";
import type { SerializablePublicCitizenReportStatus } from "@/lib/citizen-reports/public-report-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTimeSq } from "@/lib/format-date";

export function CitizenReportStatusLookup({
  id = "citizen-report-number",
  initialReportNumber = "",
}: {
  id?: string;
  initialReportNumber?: string;
}) {
  const [reportNumber, setReportNumber] = useState(initialReportNumber);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SerializablePublicCitizenReportStatus | null>(null);

  useEffect(() => {
    if (initialReportNumber) {
      setReportNumber(initialReportNumber);
    }
  }, [initialReportNumber]);

  useEffect(() => {
    if (!initialReportNumber.trim()) return;

    let cancelled = false;
    async function lookupInitial() {
      setLoading(true);
      setError(null);
      setStatus(null);
      const result = await lookupCitizenReportStatusAction(initialReportNumber);
      if (cancelled) return;
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus(result.status);
    }

    void lookupInitial();
    return () => {
      cancelled = true;
    };
  }, [initialReportNumber]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reportNumber.trim();
    if (!trimmed) {
      setError("Shkruani numrin e referencës që morët pas dërgimit të raportit.");
      setStatus(null);
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);
    const result = await lookupCitizenReportStatusAction(trimmed);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    setStatus(result.status);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          Numri i referencës
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={id}
            value={reportNumber}
            onChange={(e) => {
              setReportNumber(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="P.sh. RPT-2026-000001"
            className="h-11 font-mono uppercase tracking-wide"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-11 shrink-0 bg-gov-primary hover:bg-gov-secondary"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="mr-2 h-4 w-4" aria-hidden />
            )}
            Shiko statusin
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Numri i referencës ju jepet pas dërgimit të raportit. Nuk kërkohet llogari.
        </p>
      </form>

      {status && (
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/70">
                Raporti juaj
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-gov-primary">{status.reportNumber}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gov-primary shadow-sm ring-1 ring-border/60">
              {status.statusLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Lloji: <span className="font-medium text-foreground">{status.typeLabel}</span>
          </p>

          <ol className="mt-4 space-y-3">
            {status.timeline.map((step) => (
              <li key={step.key} className="flex items-start gap-3">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {step.done && step.at
                      ? formatDateTimeSq(step.at)
                      : step.key === "resolved" && !step.done
                        ? "Ende në proces"
                        : step.key === "read" && !step.done
                          ? "Ende në pritje"
                          : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

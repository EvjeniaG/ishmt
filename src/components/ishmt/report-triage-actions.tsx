"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardList } from "lucide-react";
import { CitizenReportStatus } from "@prisma/client";
import {
  assignReportToSelfAction,
  updateReportStatusAction,
} from "@/lib/actions/citizen-report-actions";
import { CITIZEN_REPORT_STATUS_LABELS } from "@/lib/registration/report-labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function staffNextStatuses(current: CitizenReportStatus): CitizenReportStatus[] {
  switch (current) {
    case "SUBMITTED":
      return ["TRIAGED"];
    case "TRIAGED":
      return ["ASSIGNED", "INVESTIGATING"];
    case "ASSIGNED":
      return ["INVESTIGATING"];
    case "INVESTIGATING":
      return ["RESOLVED", "DISMISSED"];
    default:
      return [];
  }
}

function statusOptionsForRole(
  current: CitizenReportStatus,
  mode: "staff" | "assigned_inspector",
): { value: CitizenReportStatus; label: string }[] {
  const label = (value: CitizenReportStatus) => ({
    value,
    label: CITIZEN_REPORT_STATUS_LABELS[value],
  });

  if (mode === "assigned_inspector") {
    const options: CitizenReportStatus[] = [];
    if (current === "ASSIGNED" || current === "TRIAGED" || current === "SUBMITTED") {
      options.push("INVESTIGATING");
    }
    if (current !== "RESOLVED" && current !== "DISMISSED") {
      options.push("RESOLVED");
    }
    return options.map(label);
  }

  return staffNextStatuses(current).map(label);
}

export function ReportTriageActions({
  reportId,
  status,
  assignedToMe,
  canSelfAssign,
  mode = "staff",
}: {
  reportId: string;
  status: CitizenReportStatus;
  assignedToMe: boolean;
  canSelfAssign: boolean;
  mode?: "staff" | "assigned_inspector";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const options = useMemo(() => statusOptionsForRole(status, mode), [status, mode]);
  const [nextStatus, setNextStatus] = useState<CitizenReportStatus>(options[0]?.value ?? status);

  useEffect(() => {
    setNextStatus(options[0]?.value ?? status);
    setConfirmed(false);
  }, [options, status]);

  const isClosed = status === "RESOLVED" || status === "DISMISSED";
  const isClosing = nextStatus === "RESOLVED" || nextStatus === "DISMISSED";

  async function assign() {
    setBusy(true);
    setError(null);
    const result = await assignReportToSelfAction(reportId);
    setBusy(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function updateStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isClosing && !confirmed) {
      setError("Konfirmoni mbylljen e raportit para se të vazhdoni.");
      return;
    }

    setBusy(true);
    setError(null);
    const result = await updateReportStatusAction(new FormData(e.currentTarget));
    setBusy(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  if (isClosed) {
    return (
      <p className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Raporti është mbyllur. Nuk ka veprime të tjera të disponueshme.
      </p>
    );
  }

  if (options.length === 0) {
    return (
      <p className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Statusi aktual: <strong>{CITIZEN_REPORT_STATUS_LABELS[status]}</strong>. Nuk ka hapa të
        mbetur për këtë rol.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gov-primary/10 text-gov-primary">
          <ClipboardList className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="font-semibold text-foreground">Statusi aktual</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {CITIZEN_REPORT_STATUS_LABELS[status]}
            {assignedToMe ? " · Ju jeni inspektori i caktuar" : ""}
          </p>
        </div>
      </div>

      {canSelfAssign && !assignedToMe && (
        <Button onClick={assign} disabled={busy} variant="outline">
          Merre në ngarkim
        </Button>
      )}

      <form onSubmit={updateStatus} className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4 sm:p-5">
        <input type="hidden" name="reportId" value={reportId} />
        <div className="space-y-1">
          <Label htmlFor="status">Hapi i radhës</Label>
          <select
            id="status"
            name="status"
            className="flex h-11 w-full rounded-md border bg-background px-3 text-sm"
            value={nextStatus}
            onChange={(e) => {
              setNextStatus(e.target.value as CitizenReportStatus);
              setConfirmed(false);
              setError(null);
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Zgjidhni vetëm hapin e radhës. Ndryshimet regjistrohen në historinë e veprimeve.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="comment">
            Shënim {isClosing ? "(i detyrueshëm për mbyllje)" : "(opsional)"}
          </Label>
          <textarea
            id="comment"
            name="comment"
            rows={3}
            required={isClosing}
            className="flex w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder={
              isClosing
                ? "Shkruani si u zgjidh ose pse u refuzua raporti…"
                : "Shtoni një shënim për veprimin…"
            }
          />
        </div>

        {isClosing && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1"
            />
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                Konfirmoj mbylljen e raportit si{" "}
                <strong>{CITIZEN_REPORT_STATUS_LABELS[nextStatus]}</strong>. Ky veprim nuk mund të
                zhbëhet lehtësisht.
              </span>
            </span>
          </label>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          variant={isClosing ? "destructive" : "default"}
          disabled={busy || (isClosing && !confirmed)}
          className={isClosing ? undefined : "bg-gov-primary hover:bg-gov-secondary"}
        >
          {busy ? "Duke ruajtur…" : isClosing ? "Mbyll raportin" : "Ruaj veprimin"}
        </Button>
      </form>
    </div>
  );
}

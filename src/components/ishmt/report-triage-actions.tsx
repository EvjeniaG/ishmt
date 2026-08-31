"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { CitizenReportStatus } from "@prisma/client";
import {
  assignReportToSelfAction,
  updateReportStatusAction,
} from "@/lib/actions/citizen-report-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const NEXT_STATUS_OPTIONS: { value: CitizenReportStatus; label: string }[] = [
  { value: "TRIAGED", label: "Në shqyrtim" },
  { value: "INVESTIGATING", label: "Në hetim" },
  { value: "RESOLVED", label: "Zgjidhur" },
  { value: "DISMISSED", label: "Refuzuar" },
];

export function ReportTriageActions({
  reportId,
  status,
  assignedToMe,
  canSelfAssign,
}: {
  reportId: string;
  status: CitizenReportStatus;
  assignedToMe: boolean;
  canSelfAssign: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    setError(null);
    const result = await updateReportStatusAction(new FormData(e.currentTarget));
    setBusy(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  const isClosed = status === "RESOLVED" || status === "DISMISSED";

  return (
    <div className="space-y-4">
      {canSelfAssign && !assignedToMe && !isClosed && (
        <Button onClick={assign} disabled={busy}>
          Merre në ngarkim
        </Button>
      )}

      {!isClosed && (
        <form onSubmit={updateStatus} className="grid gap-3 border-t pt-4">
          <input type="hidden" name="reportId" value={reportId} />
          <div className="space-y-1">
            <Label htmlFor="status">Përditëso statusin</Label>
            <select
              id="status"
              name="status"
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              defaultValue="TRIAGED"
            >
              {NEXT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="comment">Shënim (i detyrueshëm për mbyllje)</Label>
            <textarea
              id="comment"
              name="comment"
              rows={3}
              className="flex w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Shtoni një shënim për veprimin…"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="outline" disabled={busy}>
            Ruaj veprimin
          </Button>
        </form>
      )}

      {isClosed && error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

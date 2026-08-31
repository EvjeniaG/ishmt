"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitMonthlyReportAction } from "@/lib/actions/maintenance-work-actions";
import {
  MONTHLY_CONTROL_CHECK_STATUS_LABELS,
  MONTHLY_CONTROL_CHECKLIST,
  type MonthlyControlCheckStatus,
} from "@/lib/constants/monthly-control-checklist";
import { deriveMonthlyControlResult } from "@/lib/maintenance/monthly-control-payload";
import { uploadElevatorDocumentClient } from "@/lib/documents/upload-elevator-document-client";
import { COMPLIANCE_DOCUMENT_ACCEPT, COMPLIANCE_DOCUMENT_HINT } from "@/lib/constants/document-upload";

type ElevatorOption = { id: string; registryNumber: string; address: string };

const inputClass = "h-9 text-sm";
const MONTHS = [
  "Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor",
  "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor",
];

function emptyChecklist(): Record<string, MonthlyControlCheckStatus | ""> {
  return Object.fromEntries(
    MONTHLY_CONTROL_CHECKLIST.flatMap((section) =>
      section.items.map((item) => [item.id, ""]),
    ),
  );
}

export function MonthlyReportForm({
  elevators,
  fixedElevatorId,
  defaultTechnicianName,
}: {
  elevators: ElevatorOption[];
  fixedElevatorId?: string;
  /** Emri i teknikut nga llogaria e përdoruesit - plotësohet automatikisht. */
  defaultTechnicianName?: string;
}) {
  const router = useRouter();
  const now = new Date();
  const [elevatorId, setElevatorId] = useState(fixedElevatorId ?? "");
  const [performedDate, setPerformedDate] = useState(now.toISOString().slice(0, 10));
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [technicianName, setTechnicianName] = useState(defaultTechnicianName ?? "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [checklist, setChecklist] = useState(emptyChecklist);
  const [observations, setObservations] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const result = useMemo(() => {
    const filled = Object.fromEntries(
      Object.entries(checklist).filter(([, value]) => value !== ""),
    ) as Record<string, MonthlyControlCheckStatus>;
    if (Object.keys(filled).length === 0) return null;
    return deriveMonthlyControlResult(filled);
  }, [checklist]);

  const duration = useMemo(() => {
    if (!startTime || !endTime) return "";
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff <= 0) return "Pavlefshme";
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}min`;
  }, [startTime, endTime]);

  function setChecklistItem(id: string, status: MonthlyControlCheckStatus) {
    setChecklist((prev) => ({ ...prev, [id]: status }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetElevatorId = fixedElevatorId ?? elevatorId;
    if (!targetElevatorId) return setError("Zgjidhni ashensorin.");

    setLoading(true);
    setError(null);
    try {
      let documentId: string | undefined;
      if (file) {
        documentId = await uploadElevatorDocumentClient(file, targetElevatorId, {
          classification: "MAINTENANCE_LOG",
          purpose: "MONTHLY_REPORT",
        });
      }

      const resultAction = await submitMonthlyReportAction({
        elevatorId: targetElevatorId,
        performedDate,
        periodYear: year,
        periodMonth: month,
        technicianName,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        checklist: checklist as Record<string, MonthlyControlCheckStatus>,
        observations: observations || undefined,
        notes: notes || undefined,
        documentId,
      });
      if (!resultAction.success) throw new Error(resultAction.error);

      setChecklist(emptyChecklist());
      setObservations("");
      setNotes("");
      setFile(null);
      setStartTime("");
      setEndTime("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veprimi dështoi");
    } finally {
      setLoading(false);
    }
  }

  if (elevators.length === 0 && !fixedElevatorId) {
    return <p className="text-sm text-muted-foreground">Nuk keni ashensorë nën kontratë aktive.</p>;
  }

  const years = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        {!fixedElevatorId && (
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="elevatorId" className="text-xs">Ashensori *</Label>
            <select
              id="elevatorId"
              value={elevatorId}
              onChange={(e) => setElevatorId(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Zgjidhni ashensorin</option>
              {elevators.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.registryNumber} - {e.address}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="performedDate" className="text-xs">Data e kontrollit *</Label>
          <Input
            id="performedDate"
            type="date"
            required
            value={performedDate}
            onChange={(e) => setPerformedDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="technicianName" className="text-xs">Tekniku që kryeu kontrollin *</Label>
          <Input
            id="technicianName"
            required
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="month" className="text-xs">Periudha (muaji) *</Label>
          <select
            id="month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex h-9 w-full rounded-md border px-3 text-sm"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="year" className="text-xs">Periudha (viti) *</Label>
          <select
            id="year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex h-9 w-full rounded-md border px-3 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="startTime" className="text-xs">Ora e fillimit</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endTime" className="text-xs">Ora e mbarimit</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputClass}
          />
        </div>

        {duration && (
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Kohëzgjatja</Label>
            <Input value={duration} readOnly className={`${inputClass} bg-muted`} />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Lista e kontrollit në objekt</h3>
          <p className="text-xs text-muted-foreground">
            Plotësoni çdo pikë sipas gjendjes së konstatuar gjatë kontrollit periodik mujor.
          </p>
        </div>

        {MONTHLY_CONTROL_CHECKLIST.map((section) => (
          <div key={section.id} className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <p className="mb-3 text-sm font-medium">{section.title}</p>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 border-b border-border/50 pb-3 last:border-0 last:pb-0 md:grid-cols-[1fr_auto]"
                >
                  <p className="text-sm">{item.label}</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {(Object.keys(MONTHLY_CONTROL_CHECK_STATUS_LABELS) as MonthlyControlCheckStatus[]).map(
                      (status) => (
                        <label key={status} className="flex items-center gap-1.5 whitespace-nowrap">
                          <input
                            type="radio"
                            name={`check-${item.id}`}
                            checked={checklist[item.id] === status}
                            onChange={() => setChecklistItem(item.id, status)}
                            required={checklist[item.id] === ""}
                          />
                          {MONTHLY_CONTROL_CHECK_STATUS_LABELS[status]}
                        </label>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {result && (
        <div
          className={`rounded-md border p-3 text-sm ${
            result === "PASS"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          Rezultati i kontrollit: <strong>{result === "PASS" ? "KALUES" : "JO KALUES"}</strong>
        </div>
      )}

      {result === "FAIL" && (
        <div className="space-y-1">
          <Label htmlFor="observations" className="text-xs">Vërejtjet për pikat jo konforme *</Label>
          <textarea
            id="observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            required
            className="flex w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="notes" className="text-xs">Shënime shtesë</Label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="flex w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="attachment" className="text-xs">Foto / dokument shtesë (opsionale)</Label>
        <Input
          id="attachment"
          type="file"
          accept={COMPLIANCE_DOCUMENT_ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={inputClass}
        />
        <p className="text-[11px] text-muted-foreground">{COMPLIANCE_DOCUMENT_HINT}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Duke ruajtur…" : "Regjistro kontrollin periodik"}
      </Button>
    </form>
  );
}

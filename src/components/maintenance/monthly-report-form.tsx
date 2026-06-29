"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitMonthlyReportAction } from "@/lib/actions/maintenance-work-actions";
import { COMPLIANCE_DOCUMENT_ACCEPT, COMPLIANCE_DOCUMENT_HINT } from "@/lib/constants/document-upload";

type ElevatorOption = { id: string; registryNumber: string; address: string };

const inputClass = "h-9 text-sm";
const MONTHS = [
  "Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor",
  "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor",
];

async function uploadDocument(file: File, elevatorId: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("entityType", "elevator");
  fd.append("entityId", elevatorId);
  fd.append("classification", "MAINTENANCE_LOG");
  fd.append("purpose", "MONTHLY_REPORT");
  const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ngarkimi i dokumentit dështoi.");
  return data.documentId as string;
}

export function MonthlyReportForm({
  elevators,
  fixedElevatorId,
}: {
  elevators: ElevatorOption[];
  fixedElevatorId?: string;
}) {
  const router = useRouter();
  const now = new Date();
  const [elevatorId, setElevatorId] = useState(fixedElevatorId ?? "");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetElevatorId = fixedElevatorId ?? elevatorId;
    if (!targetElevatorId) return setError("Zgjidhni ashensorin.");
    if (!file) return setError("Ngarkoni raportin (PDF).");
    setLoading(true);
    setError(null);
    try {
      const documentId = await uploadDocument(file, targetElevatorId);
      const result = await submitMonthlyReportAction({
        elevatorId: targetElevatorId,
        periodYear: year,
        periodMonth: month,
        documentId,
        notes: notes || undefined,
      });
      if (!result.success) throw new Error(result.error);
      setNotes("");
      setFile(null);
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
    <form onSubmit={onSubmit} className="space-y-4">
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
          <Label htmlFor="month" className="text-xs">Muaji *</Label>
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
          <Label htmlFor="year" className="text-xs">Viti *</Label>
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

        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="report" className="text-xs">Raporti teknik periodik (30 ditë) *</Label>
          <Input
            id="report"
            type="file"
            accept={COMPLIANCE_DOCUMENT_ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={inputClass}
          />
          <p className="text-[11px] text-muted-foreground">
            {COMPLIANCE_DOCUMENT_HINT} Raporti dorëzohet çdo 30 ditë sipas kërkesave të mirëmbajtjes.
          </p>
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="notes" className="text-xs">Shënime shtesë</Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="flex w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Duke ngarkuar…" : "Ngarko raportin teknik"}
      </Button>
    </form>
  );
}

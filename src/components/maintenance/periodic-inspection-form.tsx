"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logPeriodicInspectionAction } from "@/lib/actions/certifier-inspection-actions";
import { COMPLIANCE_DOCUMENT_ACCEPT, COMPLIANCE_DOCUMENT_HINT } from "@/lib/constants/document-upload";

export type InspectionElevatorOption = {
  id: string;
  registryNumber: string;
  address: string;
  intervalMonths: number;
  nextDue: string;
  daysRemaining: number;
  overdue: boolean;
};

const inputClass = "h-9 text-sm";

async function uploadDocument(file: File, elevatorId: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("entityType", "elevator");
  fd.append("entityId", elevatorId);
  fd.append("classification", "INSPECTION_REPORT");
  fd.append("purpose", "PERIODIC_INSPECTION");
  const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ngarkimi i dokumentit dështoi.");
  return data.documentId as string;
}

export function PeriodicInspectionForm({ elevators }: { elevators: InspectionElevatorOption[] }) {
  const router = useRouter();
  const [elevatorId, setElevatorId] = useState("");
  const [conductedDate, setConductedDate] = useState("");
  const [approvedBodyNumber, setApprovedBodyNumber] = useState("");
  const [examinationType, setExaminationType] = useState("EKZAMINIM I PLOTË");
  const [result, setResult] = useState<"PASS" | "FAIL">("PASS");
  const [findings, setFindings] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = useMemo(
    () => elevators.find((e) => e.id === elevatorId) ?? null,
    [elevators, elevatorId],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!elevatorId) return setError("Zgjidhni ashensorin.");
    if (!file) return setError("Ngarkoni raportin e inspektimit.");
    if (result === "FAIL" && findings.trim().length === 0)
      return setError("Specifikoni defektet e konstatuara.");
    setLoading(true);
    setError(null);
    try {
      const reportDocumentId = await uploadDocument(file, elevatorId);
      const res = await logPeriodicInspectionAction({
        elevatorId,
        conductedDate,
        approvedBodyNumber,
        examinationType,
        result,
        findings: findings || undefined,
        reportDocumentId,
      });
      if (!res.success) throw new Error(res.error);
      router.refresh();
      setFile(null);
      setFindings("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veprimi dështoi");
    } finally {
      setLoading(false);
    }
  }

  if (elevators.length === 0) {
    return <p className="text-sm text-muted-foreground">Nuk keni ashensorë nën kontratë aktive.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
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

      {selected && (
        <div
          className={`rounded-md border p-3 text-sm ${
            selected.overdue
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {selected.overdue ? (
            <p className="font-medium">
              ⛔ INSPEKTIMI PERIODIK ËSHTË VONUAR - duhej bërë më{" "}
              {new Date(selected.nextDue).toLocaleDateString("sq-AL")}
            </p>
          ) : (
            <p>
              Inspektimi i ardhshëm periodik:{" "}
              <strong>{new Date(selected.nextDue).toLocaleDateString("sq-AL")}</strong> -{" "}
              {selected.daysRemaining} ditë mbetur (çdo {selected.intervalMonths} muaj)
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="conductedDate" className="text-xs">Data e inspektimit *</Label>
          <Input
            id="conductedDate"
            type="date"
            required
            value={conductedDate}
            onChange={(e) => setConductedDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="approvedBodyNumber" className="text-xs">Organi i Miratuar (OM) *</Label>
          <Input
            id="approvedBodyNumber"
            required
            placeholder="p.sh. OM 013"
            value={approvedBodyNumber}
            onChange={(e) => setApprovedBodyNumber(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Lloji i ekzaminimit *</Label>
        <div className="flex gap-4 text-sm">
          {["EKZAMINIM I PLOTË", "EKZAMINIM PERIODIK"].map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input
                type="radio"
                name="examinationType"
                checked={examinationType === t}
                onChange={() => setExaminationType(t)}
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Rezultati *</Label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="result" checked={result === "PASS"} onChange={() => setResult("PASS")} />
            KALUES
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="result" checked={result === "FAIL"} onChange={() => setResult("FAIL")} />
            JO KALUES
          </label>
        </div>
      </div>

      {result === "FAIL" && (
        <div className="space-y-1">
          <Label htmlFor="findings" className="text-xs">Defektet e konstatuara *</Label>
          <textarea
            id="findings"
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="report" className="text-xs">Raporti i inspektimit *</Label>
        <Input
          id="report"
          type="file"
          accept={COMPLIANCE_DOCUMENT_ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={inputClass}
        />
        <p className="text-[11px] text-muted-foreground">{COMPLIANCE_DOCUMENT_HINT}</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Duke ruajtur…" : "Regjistro inspektimin periodik"}
      </Button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logInterventionAction } from "@/lib/actions/maintenance-work-actions";
import { uploadElevatorDocumentClient } from "@/lib/documents/upload-elevator-document-client";
import { COMPLIANCE_DOCUMENT_ACCEPT, COMPLIANCE_DOCUMENT_HINT } from "@/lib/constants/document-upload";
import { INTERVENTION_TYPES } from "@/lib/constants/maintenance";

type ElevatorOption = { id: string; registryNumber: string; address: string };

const inputClass = "h-9 text-sm";

export function InterventionForm({
  elevators,
  fixedElevatorId,
}: {
  elevators: ElevatorOption[];
  /** Kur formulari hapet nga dosja e një ashensori - pa listë zgjedhjeje. */
  fixedElevatorId?: string;
}) {
  const router = useRouter();
  const [elevatorId, setElevatorId] = useState(fixedElevatorId ?? "");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const duration = useMemo(() => {
    if (!start || !end) return "";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (diff <= 0) return "Pavlefshme";
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m}min`;
  }, [start, end]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const targetElevatorId = fixedElevatorId ?? elevatorId;
    if (!targetElevatorId) {
      setError("Zgjidhni ashensorin.");
      return;
    }
    if (!file) {
      setError("Ngarkoni dokumentin e ndërhyrjes (PDF).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const documentId = await uploadElevatorDocumentClient(file, targetElevatorId, {
        classification: "MAINTENANCE_LOG",
        purpose: "INTERVENTION",
      });
      const formData = new FormData(e.currentTarget);
      formData.set("documentId", documentId);
      const result = await logInterventionAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      (e.target as HTMLFormElement).reset();
      setStart("");
      setEnd("");
      if (!fixedElevatorId) setElevatorId("");
      setFile(null);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Ngarkimi i dokumentit dështoi.");
    } finally {
      setLoading(false);
    }
  }

  if (elevators.length === 0 && !fixedElevatorId) {
    return (
      <p className="text-sm text-muted-foreground">
        Nuk keni ashensorë nën kontratë aktive për të regjistruar ndërhyrje.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {!fixedElevatorId && (
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="elevatorId" className="text-xs">Ashensori *</Label>
            <select
              id="elevatorId"
              name="elevatorId"
              required
              value={elevatorId}
              onChange={(event) => setElevatorId(event.target.value)}
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
        {fixedElevatorId && (
          <input type="hidden" name="elevatorId" value={fixedElevatorId} />
        )}

        <div className="space-y-1">
          <Label htmlFor="performedDate" className="text-xs">Data e ndërhyrjes *</Label>
          <Input id="performedDate" name="performedDate" type="date" required className={inputClass} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="interventionType" className="text-xs">Lloji i ndërhyrjes *</Label>
          <select
            id="interventionType"
            name="interventionType"
            required
            className="flex h-9 w-full rounded-md border px-3 text-sm"
          >
            {INTERVENTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="startTime" className="text-xs">Ora e fillimit *</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            required
            className={inputClass}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="endTime" className="text-xs">Ora e mbarimit *</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            required
            className={inputClass}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs">Kohëzgjatja</Label>
          <Input value={duration} readOnly className={`${inputClass} bg-muted`} />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="technicianName" className="text-xs">Emri i teknikut *</Label>
          <Input id="technicianName" name="technicianName" required className={inputClass} />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="description" className="text-xs">Çfarë u bë * (min 20 karaktere)</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            minLength={20}
            required
            className="flex w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="partsReplaced" className="text-xs">Pjesët e zëvendësuara (opsionale)</Label>
          <textarea
            id="partsReplaced"
            name="partsReplaced"
            rows={2}
            placeholder="p.sh. kabllo tërheqëse, buton kati 3, sensor dere"
            className="flex w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="interventionDocument" className="text-xs">Dokumenti / raporti i ndërhyrjes *</Label>
          <Input
            id="interventionDocument"
            type="file"
            accept={COMPLIANCE_DOCUMENT_ACCEPT}
            required
            className={inputClass}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-[11px] text-muted-foreground">{COMPLIANCE_DOCUMENT_HINT}</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? "Duke ruajtur…" : "Regjistro ndërhyrjen"}
      </Button>
    </form>
  );
}

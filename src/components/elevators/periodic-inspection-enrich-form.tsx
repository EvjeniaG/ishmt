"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enrichPeriodicInspectionAction } from "@/lib/actions/certifier-inspection-actions";
import { COMPLIANCE_DOCUMENT_ACCEPT, COMPLIANCE_DOCUMENT_HINT } from "@/lib/constants/document-upload";

export function PeriodicInspectionEnrichForm({
  inspectionId,
  elevatorId,
  defaultApprovedBodyNumber,
}: {
  inspectionId: string;
  elevatorId: string;
  defaultApprovedBodyNumber?: string | null;
}) {
  const router = useRouter();
  const [approvedBodyNumber, setApprovedBodyNumber] = useState(defaultApprovedBodyNumber ?? "");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Ngarkoni dokumentin e raportit.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("entityType", "elevator");
      fd.append("entityId", elevatorId);
      fd.append("classification", "INSPECTION_REPORT");
      fd.append("purpose", "PERIODIC_INSPECTION");
      const uploadRes = await fetch("/api/documents/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Ngarkimi dështoi.");

      const res = await enrichPeriodicInspectionAction({
        inspectionId,
        reportDocumentId: uploadData.documentId as string,
        approvedBodyNumber: approvedBodyNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (!res.success) throw new Error(res.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veprimi dështoi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 rounded-md border border-dashed border-gov-primary/40 bg-gov-primary/5 p-3">
      <p className="text-xs font-medium text-foreground">OMI — plotësoni raportin dhe dokumentin</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`omi-${inspectionId}`} className="text-xs">
            Trupi OM
          </Label>
          <Input
            id={`omi-${inspectionId}`}
            value={approvedBodyNumber}
            onChange={(e) => setApprovedBodyNumber(e.target.value)}
            placeholder="p.sh. OM 007"
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`doc-${inspectionId}`} className="text-xs">
            Dokumenti i raportit *
          </Label>
          <Input
            id={`doc-${inspectionId}`}
            type="file"
            accept={COMPLIANCE_DOCUMENT_ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="h-9 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`notes-${inspectionId}`} className="text-xs">
          Shënime (opsionale)
        </Label>
        <textarea
          id={`notes-${inspectionId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="flex w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{COMPLIANCE_DOCUMENT_HINT}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Duke ruajtur…" : "Ruaj raportin"}
      </Button>
    </form>
  );
}

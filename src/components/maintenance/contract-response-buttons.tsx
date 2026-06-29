"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  acceptMaintenanceContractAction,
  rejectMaintenanceContractAction,
} from "@/lib/actions/maintenance-work-actions";
import { acceptInspectionContractAction } from "@/lib/actions/certifier-inspection-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadElevatorDocumentClient } from "@/lib/documents/upload-elevator-document-client";
import {
  CONTRACT_DOCUMENT_ACCEPT,
  CONTRACT_DOCUMENT_HINT,
} from "@/lib/constants/document-upload";

export function ContractResponseButtons({
  contractId,
  elevatorId,
  mode = "maintenance",
}: {
  contractId: string;
  elevatorId: string;
  mode?: "maintenance" | "certifier";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [contractFile, setContractFile] = useState<File | null>(null);

  async function accept() {
    if (!contractFile) {
      setError("Ngarkoni kontratën e nënshkruar.");
      return;
    }
    setBusy("accept");
    setError(null);
    try {
      const purpose =
        mode === "certifier" ? "PERIODIC_INSPECTION_CONTRACT" : "MAINTENANCE_CONTRACT";
      const documentId = await uploadElevatorDocumentClient(contractFile, elevatorId, {
        classification: "OTHER",
        purpose,
      });
      const result =
        mode === "certifier"
          ? await acceptInspectionContractAction(contractId, documentId)
          : await acceptMaintenanceContractAction(contractId, documentId);
      if (!result.success) setError(result.error);
      else router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Ngarkimi i dokumentit dështoi.");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (rejectReason.trim().length < 5) {
      setError("Arsyeja e refuzimit duhet të ketë të paktën 5 karaktere.");
      return;
    }
    setBusy("reject");
    setError(null);
    const result = await rejectMaintenanceContractAction(contractId, rejectReason.trim());
    setBusy(null);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="flex w-full max-w-md flex-col items-stretch gap-3">
      <div className="space-y-1">
        <Label htmlFor={`contract-doc-${contractId}`} className="text-sm font-medium">
          Kontrata e nënshkruar *
        </Label>
        <Input
          id={`contract-doc-${contractId}`}
          type="file"
          accept={CONTRACT_DOCUMENT_ACCEPT}
          required
          onChange={(event) => setContractFile(event.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">{CONTRACT_DOCUMENT_HINT}</p>
        {contractFile && (
          <p className="text-xs text-muted-foreground">Skedari: {contractFile.name}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void accept()} disabled={busy !== null || !contractFile} size="sm">
          {busy === "accept" ? "Duke pranuar…" : "Prano kontratën"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowReject((v) => !v)}
          disabled={busy !== null || mode === "certifier"}
          size="sm"
        >
          Refuzo
        </Button>
      </div>

      {showReject && (
        <div className="space-y-2 rounded-md border p-3">
          <Label className="text-xs">Arsye refuzimi</Label>
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Shpjegoni arsyen"
          />
          <Button variant="destructive" size="sm" onClick={() => void reject()} disabled={busy !== null}>
            {busy === "reject" ? "Duke refuzuar…" : "Konfirmo refuzimin"}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

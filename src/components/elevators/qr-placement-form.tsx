"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COMPLIANCE_DOCUMENT_ACCEPT, COMPLIANCE_DOCUMENT_HINT } from "@/lib/constants/document-upload";

export function QrPlacementForm({
  qrCodeId,
  elevatorId,
  registryNumber,
  hasPlacementPhoto,
  placementPhotoDocumentId,
}: {
  qrCodeId: string;
  elevatorId: string;
  registryNumber?: string;
  hasPlacementPhoto: boolean;
  placementPhotoDocumentId?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("entityType", "qr_code");
    formData.set("entityId", qrCodeId);
    formData.set("classification", "TECHNICAL");
    formData.set("purpose", "QR_PLACEMENT_PHOTO");

    try {
      const uploadRes = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        setError(uploadData.error ?? "Ngarkimi dështoi");
        return;
      }

      const confirmRes = await fetch("/api/qr/placement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCodeId,
          documentId: uploadData.documentId,
        }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.success) {
        setError(confirmData.error ?? "Konfirmimi dështoi");
        return;
      }

      router.refresh();
    } catch {
      setError("Ngarkimi dështoi");
    } finally {
      setUploading(false);
    }
  }

  if (hasPlacementPhoto) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-green-700" aria-hidden />
            Vendosja e QR - e dokumentuar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-green-700">
            Fotografia e vendosjes së kodit QR për ashensorin{" "}
            <strong>{registryNumber ?? elevatorId.slice(0, 8)}</strong> është regjistruar.
          </p>
          {placementPhotoDocumentId && (
            <a
              href={`/api/documents/${placementPhotoDocumentId}/download`}
              className="inline-flex text-sm font-medium text-gov-primary hover:underline"
            >
              Shiko / shkarko fotografinë →
            </a>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200/80 bg-amber-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-amber-800" aria-hidden />
          Konfirmoni vendosjen e QR me fotografi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Pas printimit dhe ngjitjes së etiketës QR në ashensorin{" "}
            <strong>{registryNumber ?? "-"}</strong>, ngarkoni një fotografi që tregon qartë
            vendosjen fizike të kodit (p.sh. brenda kabinës ose pranë panelit).
          </p>
          <div className="space-y-1">
            <Label htmlFor={`qr-placement-${qrCodeId}`}>Fotografia e vendosjes *</Label>
            <Input
              id={`qr-placement-${qrCodeId}`}
              name="file"
              type="file"
              required
              accept={COMPLIANCE_DOCUMENT_ACCEPT}
            />
            <p className="text-xs text-muted-foreground">{COMPLIANCE_DOCUMENT_HINT}</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={uploading}>
            {uploading ? "Duke ngarkuar…" : "Ngarko dhe konfirmo vendosjen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

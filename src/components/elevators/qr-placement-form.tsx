"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QrPlacementForm({
  qrCodeId,
  elevatorId,
  hasPlacementPhoto,
}: {
  qrCodeId: string;
  elevatorId: string;
  hasPlacementPhoto: boolean;
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
          <CardTitle>Konfirmimi i vendosjes së QR</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-700">Fotografia e vendosjes së QR është regjistruar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Konfirmoni vendosjen e QR</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Ngarkoni fotografinë e vendosjes së kodit QR në ashensor (elevator {elevatorId.slice(0, 8)}…).
          </p>
          <div className="space-y-1">
            <Label>Fotografia</Label>
            <Input name="file" type="file" required accept="image/png,image/jpeg,image/webp" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={uploading}>
            {uploading ? "Duke ngarkuar..." : "Konfirmo vendosjen"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

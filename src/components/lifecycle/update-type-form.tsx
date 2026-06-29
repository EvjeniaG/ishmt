"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveUpdateTypeAction } from "@/lib/actions/lifecycle-actions";
import { DATA_UPDATE_SUBTYPE_LABELS } from "@/lib/constants/application-type-guide";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const UPDATE_TYPES = Object.entries(DATA_UPDATE_SUBTYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const UPDATE_TYPE_HINTS: Record<string, string> = {
  SERIAL_NUMBER_CHANGE: "Kur numri serial ndryshon pas kontrollit nga OMI ose ndërhyrjes teknike.",
  MAINTENANCE_COMPANY_CHANGE: "Kur ndryshon kompania që mirëmbajt ashensorin.",
  ADDRESS_CHANGE: "Kur adresa ndryshon nga organet kompetente për rishikim adrese.",
  CONTACT_UPDATE: "Për telefon, email ose kontakt - jo për ndryshim pronësie.",
};

export function UpdateTypeForm({
  applicationId,
  currentType,
}: {
  applicationId: string;
  currentType?: string | null;
}) {
  const router = useRouter();
  const [updateType, setUpdateType] = useState(currentType ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!updateType) {
      setError("Zgjidhni llojin e përditësimit.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await saveUpdateTypeAction(applicationId, updateType);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid max-w-lg gap-3">
      <p className="text-sm text-muted-foreground">
        Hapi 1 - Zgjidhni çfarë lloji ndryshimi po bëni. Pronësia mbetet e njëjta.
      </p>
      <div className="space-y-1">
        <Label>Lloji i përditësimit *</Label>
        <select
          value={updateType}
          onChange={(e) => setUpdateType(e.target.value)}
          className="flex h-10 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Zgjidhni</option>
          {UPDATE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {updateType && UPDATE_TYPE_HINTS[updateType] && (
          <p className="text-xs text-muted-foreground">{UPDATE_TYPE_HINTS[updateType]}</p>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" onClick={save} disabled={loading}>
        {loading ? "Duke ruajtur…" : "Ruaj llojin e përditësimit"}
      </Button>
    </div>
  );
}

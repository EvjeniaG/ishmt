"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ModernizationType } from "@prisma/client";
import { saveModernizationDataAction } from "@/lib/actions/lifecycle-actions";
import { MODERNIZATION_TYPE_LABELS } from "@/lib/constants/lifecycle-labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ModernizationForm({
  applicationId,
  currentType,
  currentNotes,
}: {
  applicationId: string;
  currentType?: ModernizationType | null;
  currentNotes?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    const result = await saveModernizationDataAction(applicationId, {
      modernizationType: String(form.get("modernizationType") ?? "") as ModernizationType,
      modernizationNotes: String(form.get("modernizationNotes") ?? ""),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-lg gap-3">
      <div className="space-y-1">
        <Label>Lloji i modernizimit *</Label>
        <select
          name="modernizationType"
          required
          defaultValue={currentType ?? ""}
          className="flex h-10 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Zgjidhni</option>
          {(Object.keys(MODERNIZATION_TYPE_LABELS) as ModernizationType[]).map((key) => (
            <option key={key} value={key}>
              {MODERNIZATION_TYPE_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Përshkrimi i punëve *</Label>
        <textarea
          name="modernizationNotes"
          required
          minLength={10}
          defaultValue={currentNotes ?? ""}
          className="min-h-24 w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Përshkruani punët e modernizimit (min. 10 karaktere)"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-700">Të dhënat u ruajtën.</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Duke ruajtur…" : "Ruaj të dhënat"}
      </Button>
    </form>
  );
}

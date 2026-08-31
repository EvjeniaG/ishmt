"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { submitRegistrationTechnicalDataAction } from "@/lib/actions/registration-actions";
import {
  ELEVATOR_DRIVE_TYPE_LABELS,
  SPEED_RANGE_LABELS,
  USAGE_CLASSIFICATION_LABELS,
  YES_NO_LABELS,
} from "@/lib/registration/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MANUFACTURER_SUGGESTIONS = [
  "KONE",
  "OTIS GEN2",
  "SCHINDLER 5500",
  "DOPPLER",
  "KLEEMANN",
  "THYSSENKRUPP",
  "FUJITEC",
];

export function RegistrationTechnicalDataForm({
  applicationId,
  defaults,
}: {
  applicationId: string;
  defaults: Record<string, unknown>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [serialHint, setSerialHint] = useState<string | null>(null);
  const ext = (defaults.additionalTechnical as Record<string, string> | null) ?? {};

  async function checkSerial(value: string) {
    if (!value.trim()) {
      setSerialHint(null);
      return;
    }
    const params = new URLSearchParams({ serial: value.trim(), excludeApplicationId: applicationId });
    const res = await fetch(`/api/elevators/check-serial?${params}`);
    const data = await res.json();
    setSerialHint(data.available ? null : data.message ?? "Serial i zënë");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const result = await submitRegistrationTechnicalDataAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/portal/applications/${applicationId}/select-certifier`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <datalist id="manufacturer-suggestions">
        {MANUFACTURER_SUGGESTIONS.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <Card>
        <CardHeader><CardTitle>Të dhënat teknike - Instaluesi</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Marka *</Label><Input name="brand" list="manufacturer-suggestions" defaultValue={ext.brand ?? defaults.manufacturer as string ?? ""} required /></div>
          <div className="space-y-2"><Label>Modeli</Label><Input name="model" defaultValue={defaults.model as string ?? ""} /></div>
          <div className="space-y-2"><Label>Prodhuesi *</Label><Input name="manufacturer" list="manufacturer-suggestions" defaultValue={defaults.manufacturer as string ?? ""} required /></div>
          <div className="space-y-2">
            <Label>Numri serial *</Label>
            <Input
              name="serialNumber"
              defaultValue={defaults.serialNumber as string ?? ""}
              required
              onBlur={(e) => checkSerial(e.target.value)}
            />
            {serialHint && <p className="text-xs text-destructive">{serialHint}</p>}
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Tipi i ashensorit *</Label>
            {Object.entries(ELEVATOR_DRIVE_TYPE_LABELS).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="elevatorDriveType" value={v} defaultChecked={ext.elevatorDriveType === v} required /> {l}
              </label>
            ))}
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Klasifikimi i përdorimit *</Label>
            {Object.entries(USAGE_CLASSIFICATION_LABELS).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="usageClassification" value={v} defaultChecked={ext.usageClassification === v} required /> {l}
              </label>
            ))}
          </div>
          <div className="space-y-2"><Label>Data e instalimit *</Label><Input name="installationDate" type="date" defaultValue={ext.installationDate ?? ""} required /></div>
          <div className="space-y-2"><Label>Data e vënies në shërbim</Label><Input name="commissioningDate" type="date" defaultValue={ext.commissioningDate ?? ""} /></div>
          <div className="space-y-2"><Label>Viti i instalimit *</Label><Input name="installationYear" type="number" defaultValue={defaults.manufacturingYear as number ?? ext.installationYear ?? ""} required /></div>
          <div className="space-y-2"><Label>Kapaciteti (kg) *</Label><Input name="capacityKg" type="number" defaultValue={defaults.capacityKg as number ?? ""} required /></div>
          <div className="space-y-2"><Label>Kapaciteti (persona)</Label><Input name="capacityPersons" type="number" defaultValue={defaults.capacityPersons as number ?? ""} /></div>
          <div className="space-y-2"><Label>Kate të shërbyera *</Label><Input name="floorsServed" type="number" defaultValue={defaults.floorsServed as number ?? ""} required /></div>
          <div className="space-y-2"><Label>Ndalime *</Label><Input name="stops" type="number" defaultValue={defaults.stops as number ?? ""} required /></div>
          <div className="space-y-2"><Label>Hapje *</Label><Input name="openings" type="number" defaultValue={ext.openings ?? "1"} required /></div>
          <div className="md:col-span-2 space-y-2">
            <Label>Shpejtësia *</Label>
            {Object.entries(SPEED_RANGE_LABELS).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="speedRange" value={v} defaultChecked={ext.speedRange === v} required /> {l}
              </label>
            ))}
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>I aksesueshëm për persona me aftësi të kufizuara *</Label>
            {Object.entries(YES_NO_LABELS).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="accessibleForDisabled" value={v} defaultChecked={ext.accessibleForDisabled === v} required /> {l}
              </label>
            ))}
          </div>
          <div className="space-y-2"><Label>Dimensionet e kabinës</Label><Input name="cabinDimensions" defaultValue={ext.cabinDimensions ?? ""} /></div>
          <div className="space-y-2"><Label>Dimensionet e derës</Label><Input name="doorDimensions" defaultValue={ext.doorDimensions ?? ""} /></div>
          <div className="md:col-span-2 space-y-2">
            <Label>Shënime teknike</Label>
            <textarea name="installerTechnicalNotes" defaultValue={ext.installerTechnicalNotes ?? ""} className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="bg-gov-primary">Dërgo të dhënat teknike</Button>
    </form>
  );
}

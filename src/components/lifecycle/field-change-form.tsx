"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { saveLifecycleFieldChangesAction } from "@/lib/actions/lifecycle-actions";
import { getEditableFields } from "@/lib/lifecycle/editable-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldChange } from "@/lib/services/elevator-lifecycle-service";

const MODE_INTRO = {
  correction:
    "Ndryshim - korrigjimi i gabimeve teknik, përshkrues ose shkrimor në të dhënat e regjistruara (Udhëzim p.10–11).",
  update:
    "Përditësim - modifikim i të dhënave për shkak të ndryshimeve faktike, juridike ose teknike (Udhëzim p.15). Pronësia ndryshon vetëm me Transferim pronësie.",
} as const;

export function FieldChangeForm({
  applicationId,
  mode,
  updateType,
  elevatorDefaults,
  maintenanceCompanies = [],
  excludeElevatorId,
  existingChanges = [],
  suggestedValues = {},
}: {
  applicationId: string;
  mode: "correction" | "update";
  updateType?: string | null;
  elevatorDefaults: Record<string, string>;
  maintenanceCompanies?: { id: string; name: string }[];
  excludeElevatorId?: string;
  existingChanges?: FieldChange[];
  /** Vlera të sugjeruara nga profili/llogaria - plotësohen kur fillon redaktimi. */
  suggestedValues?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [changes, setChanges] = useState<FieldChange[]>(existingChanges);
  const [draft, setDraft] = useState({ newValue: "", reason: "" });
  const [error, setError] = useState<string | null>(null);
  const [serialHint, setSerialHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fields = getEditableFields(mode, updateType);

  async function checkSerial(value: string) {
    if (!value.trim()) {
      setSerialHint(null);
      return;
    }
    const params = new URLSearchParams({
      serial: value.trim(),
      excludeApplicationId: applicationId,
    });
    if (excludeElevatorId) params.set("excludeElevatorId", excludeElevatorId);
    const res = await fetch(`/api/elevators/check-serial?${params}`);
    const data = await res.json();
    setSerialHint(data.available ? null : data.message ?? "Serial i zënë");
  }

  function startEdit(field: string, label: string) {
    setEditing(field);
    const existing = changes.find((c) => c.field === field);
    setDraft({
      newValue: existing?.newValue ?? suggestedValues[field]?.trim() ?? "",
      reason: existing?.reason ?? "",
    });
  }

  function saveRow(field: string, label: string) {
    const oldValue = elevatorDefaults[field] ?? "-";
    if (!draft.newValue.trim() || draft.newValue === oldValue) {
      setEditing(null);
      return;
    }
    if (!draft.reason.trim()) {
      setError("Arsyeja e ndryshimit është e detyrueshme.");
      return;
    }
    setChanges((prev) => {
      const rest = prev.filter((c) => c.field !== field);
      return [...rest, { field, label, oldValue, newValue: draft.newValue, reason: draft.reason }];
    });
    setEditing(null);
    setError(null);
  }

  async function persist() {
    if (changes.length === 0) {
      setError("Duhet të ndryshoni të paktën një fushë.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await saveLifecycleFieldChangesAction(applicationId, mode, changes, updateType);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ky lloj përditësimi trajtohet në një hap tjetër (p.sh. transferim pronësie).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{MODE_INTRO[mode]}</p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2">Fusha</th>
              <th className="px-3 py-2">Vlera ekzistuese</th>
              <th className="px-3 py-2">Vlera e re</th>
              <th className="px-3 py-2">Arsyeja</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map(({ field, label }) => {
              const change = changes.find((c) => c.field === field);
              const isEditing = editing === field;
              const oldDisplay =
                field === "maintenanceOrgId"
                  ? (maintenanceCompanies.find((c) => c.id === elevatorDefaults[field])?.name ??
                    elevatorDefaults[field] ??
                    "-")
                  : (elevatorDefaults[field] ?? "-");
              return (
                <tr key={field} className="border-b">
                  <td className="px-3 py-2 font-medium">{label}</td>
                  <td className="px-3 py-2 text-muted-foreground">{oldDisplay}</td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      field === "maintenanceOrgId" ? (
                        <select
                          value={draft.newValue}
                          onChange={(e) => setDraft((d) => ({ ...d, newValue: e.target.value }))}
                          className="flex h-8 w-full rounded-md border px-2 text-sm"
                        >
                          <option value="">Zgjidhni kompaninë</option>
                          {maintenanceCompanies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={draft.newValue}
                          onChange={(e) => setDraft((d) => ({ ...d, newValue: e.target.value }))}
                          onBlur={field === "serialNumber" ? () => checkSerial(draft.newValue) : undefined}
                          className="h-8"
                        />
                      )
                    ) : field === "maintenanceOrgId" ? (
                      (maintenanceCompanies.find((c) => c.id === change?.newValue)?.name ?? change?.newValue ?? "-")
                    ) : (
                      change?.newValue ?? "-"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Input
                        value={draft.reason}
                        onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
                        placeholder="Arsyeja"
                        className="h-8"
                      />
                    ) : (
                      change?.reason ?? "-"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => saveRow(field, label)}>
                        Ruaj
                      </Button>
                    ) : (
                      <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(field, label)}>
                        Ndrysho
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {serialHint && <p className="text-sm text-destructive">{serialHint}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={persist} disabled={loading}>
        {loading ? "Duke ruajtur…" : "Ruaj ndryshimet"}
      </Button>
    </div>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation/use-app-router";

type Municipality = { id: string; nameSq: string };

export function ElevatorFilters({ municipalities }: { municipalities: Municipality[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/portal/elevators?${next.toString()}`);
  }

  function toggle(key: string) {
    update(key, params.get(key) === "1" ? "" : "1");
  }

  return (
    <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card p-4">
      <select
        value={params.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className="h-9 rounded-md border px-3 text-sm"
      >
        <option value="">Të gjitha statuset</option>
        <option value="ACTIVE">Aktiv</option>
        <option value="SUSPENDED">Pezulluar</option>
        <option value="DEREGISTERED">Çregjistruar</option>
        <option value="PENDING_CONFIRMATION">Në pritje konfirmimi</option>
        <option value="UNVERIFIED">I paverifikuar</option>
      </select>
      <select
        value={params.get("compliance") ?? ""}
        onChange={(e) => update("compliance", e.target.value)}
        className="h-9 rounded-md border px-3 text-sm"
      >
        <option value="">Përputhshmëria</option>
        <option value="GREEN">Në përputhje</option>
        <option value="YELLOW">Vëmendje</option>
        <option value="RED">Jo në përputhje</option>
      </select>
      <select
        value={params.get("municipalityId") ?? ""}
        onChange={(e) => update("municipalityId", e.target.value)}
        className="h-9 rounded-md border px-3 text-sm"
      >
        <option value="">Të gjitha bashkitë</option>
        {municipalities.map((m) => (
          <option key={m.id} value={m.id}>{m.nameSq}</option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={params.get("missingMaintenance") === "1"} onChange={() => toggle("missingMaintenance")} />
        Pa mirëmbajtje
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={params.get("expiringCertificate") === "1"} onChange={() => toggle("expiringCertificate")} />
        Certifikatë që skadon
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={params.get("overdueInspection") === "1"} onChange={() => toggle("overdueInspection")} />
        Inspektim i vonuar
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={params.get("missingQrPlacement") === "1"} onChange={() => toggle("missingQrPlacement")} />
        QR pa konfirmim
      </label>
    </div>
  );
}

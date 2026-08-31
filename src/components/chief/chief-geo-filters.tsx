"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation/use-app-router";
import { ComplianceIndicator, ElevatorStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ELEVATOR_STATUS_LABELS } from "@/lib/constants/display-labels";

const COMPLIANCE_OPTIONS: { value: ComplianceIndicator; label: string }[] = [
  { value: ComplianceIndicator.GREEN, label: "Në përputhje" },
  { value: ComplianceIndicator.YELLOW, label: "Kujdes / afat" },
  { value: ComplianceIndicator.RED, label: "Jo në përputhje" },
];

const STATUS_OPTIONS = (
  Object.entries(ELEVATOR_STATUS_LABELS) as [ElevatorStatus, string][]
).map(([value, label]) => ({ value, label }));

type Region = { id: string; nameSq: string };
type Municipality = { id: string; nameSq: string; regionId: string };

export function ChiefGeoFilters({
  regions,
  municipalities,
  basePath = "/ishmt/chief/map",
}: {
  regions: Region[];
  municipalities: Municipality[];
  basePath?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const regionId = params.get("regionId") ?? "";

  const visibleMunicipalities = regionId
    ? municipalities.filter((m) => m.regionId === regionId)
    : municipalities;

  function push(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "regionId") next.delete("municipalityId");
    push(next);
  }

  const hasFilters = params.toString().length > 0;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 md:p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Qarku
          <select
            value={regionId}
            onChange={(e) => update("regionId", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Të gjithë qarqet</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nameSq}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Bashkia
          <select
            value={params.get("municipalityId") ?? ""}
            onChange={(e) => update("municipalityId", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Të gjitha bashkitë</option>
            {visibleMunicipalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nameSq}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Përputhshmëria
          <select
            value={params.get("compliance") ?? ""}
            onChange={(e) => update("compliance", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Të gjitha</option>
            {COMPLIANCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Statusi
          <select
            value={params.get("status") ?? ""}
            onChange={(e) => update("status", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Të gjitha statuset</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasFilters && (
        <div className="flex justify-end border-t border-border/80 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => router.push(basePath)}>
            Pastro filtrat
          </Button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation/use-app-router";
import { OrgStatus, OrgType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ORG_STATUS_LABELS } from "@/lib/constants/org-status";

const TYPE_OPTIONS = [
  { value: OrgType.INSTALLER, label: "Instalim" },
  { value: OrgType.CERTIFIER, label: "OM" },
];

const STATUS_OPTIONS = (
  Object.entries(ORG_STATUS_LABELS) as [OrgStatus, string][]
).map(([value, label]) => ({ value, label }));

export function DirectorateCompaniesFilters() {
  const router = useRouter();
  const params = useSearchParams();

  function push(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `/directorate/companies?${qs}` : "/directorate/companies");
  }

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  }

  function clearFilters() {
    router.push("/directorate/companies");
  }

  const hasFilters = params.toString().length > 0;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 md:p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground xl:col-span-2">
          Kërko
          <input
            type="search"
            placeholder="Emri i kompanisë ose NIPT..."
            defaultValue={params.get("q") ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                update("q", (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => {
              const current = params.get("q") ?? "";
              if (e.target.value !== current) update("q", e.target.value);
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Tipi
          <select
            value={params.get("type") ?? ""}
            onChange={(e) => update("type", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Të gjitha tipet</option>
            {TYPE_OPTIONS.map((o) => (
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
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            Pastro filtrat
          </Button>
        </div>
      )}
    </div>
  );
}

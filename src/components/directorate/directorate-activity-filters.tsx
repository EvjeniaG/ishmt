"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation/use-app-router";
import { ApplicationStatus, ApplicationType, OrgType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import type { CompanyActivityPhase } from "@/lib/services/directorate-activity-service";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";

const PHASE_OPTIONS: { value: CompanyActivityPhase; label: string }[] = [
  { value: "all", label: "Të gjitha" },
  { value: "installation", label: "Në instalim" },
  { value: "certification", label: "Në certifikim" },
];

const TYPE_OPTIONS = (
  Object.entries(APPLICATION_TYPE_LABELS) as [ApplicationType, string][]
).map(([value, label]) => ({ value, label }));

const STATUS_OPTIONS = (
  Object.entries(APPLICATION_STATUS_LABELS) as [ApplicationStatus, string][]
)
  .filter(([value]) =>
    !["DRAFT", "CANCELLED"].includes(value),
  )
  .map(([value, label]) => ({ value, label }));

type CompanyOption = {
  id: string;
  name: string;
  type: OrgType;
  nipt: string | null;
};

type MunicipalityOption = {
  id: string;
  nameSq: string;
};

const COMPANY_TYPE_LABELS: Record<string, string> = {
  INSTALLER: "Instalues",
  CERTIFIER: "Certifikues",
};

export function DirectorateActivityFilters({
  companies,
  municipalities,
}: {
  companies: CompanyOption[];
  municipalities: MunicipalityOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function push(next: URLSearchParams) {
    const qs = next.toString();
    router.push(qs ? `/directorate/activity?${qs}` : "/directorate/activity");
  }

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  }

  function setPhase(phase: CompanyActivityPhase) {
    const next = new URLSearchParams(params.toString());
    if (phase === "all") next.delete("phase");
    else next.set("phase", phase);
    push(next);
  }

  function clearFilters() {
    router.push("/directorate/activity");
  }

  const activePhase = (params.get("phase") as CompanyActivityPhase) || "all";
  const hasFilters = params.toString().length > 0;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 md:p-5">
      <div className="flex flex-wrap gap-2">
        {PHASE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPhase(option.value)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activePhase === option.value
                ? "border-gov-primary bg-gov-primary text-white"
                : "border-border text-muted-foreground hover:border-gov-primary hover:text-gov-primary"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground xl:col-span-2">
          Kërko
          <input
            type="search"
            placeholder="Nr. aplikimi, regjistri, serial, adresa, kompani, person përgjegjës..."
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
          Lloji aplikimit
          <select
            value={params.get("type") ?? ""}
            onChange={(e) => update("type", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Të gjitha llojet</option>
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

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Roli i kompanisë
          <select
            value={params.get("companyRole") ?? ""}
            onChange={(e) => update("companyRole", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Instalues ose certifikues</option>
            <option value="installer">Vetëm instalues</option>
            <option value="certifier">Vetëm certifikues</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground xl:col-span-2">
          Kompania
          <select
            value={params.get("companyId") ?? ""}
            onChange={(e) => update("companyId", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Të gjitha kompanitë</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({COMPANY_TYPE_LABELS[c.type] ?? c.type})
                {c.nipt ? ` · ${c.nipt}` : ""}
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
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nameSq}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Përditësuar nga
          <input
            type="date"
            value={params.get("dateFrom") ?? ""}
            onChange={(e) => update("dateFrom", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Përditësuar deri
          <input
            type="date"
            value={params.get("dateTo") ?? ""}
            onChange={(e) => update("dateTo", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          />
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

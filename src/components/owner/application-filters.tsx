"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ApplicationStatus, ApplicationType } from "@prisma/client";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";

const TYPE_OPTIONS: { value: ApplicationType; label: string }[] = (
  Object.entries(APPLICATION_TYPE_LABELS) as [ApplicationType, string][]
).map(([value, label]) => ({ value, label }));

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = (
  Object.entries(APPLICATION_STATUS_LABELS) as [ApplicationStatus, string][]
).filter(([value]) =>
  [
    "DRAFT",
    "BASIC_DATA_COMPLETED",
    "PENDING_INSTALLER",
    "INSTALLER_COMPLETED",
    "PENDING_CERTIFIER",
    "PENDING_OWNER_SUBMISSION",
    "SUBMITTED",
    "UNDER_REVIEW",
    "RETURNED",
    "APPROVED",
    "REJECTED",
    "CLOSED",
  ].includes(value),
).map(([value, label]) => ({ value, label }));

type Municipality = { id: string; nameSq: string };

export function ApplicationFilters({ municipalities }: { municipalities: Municipality[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/portal/applications?${next.toString()}`);
  }

  function setPreset(preset: "returned" | "rejected" | "approved" | "") {
    const next = new URLSearchParams(params.toString());
    next.delete("returned");
    next.delete("rejected");
    next.delete("approved");
    if (preset) next.set(preset, "1");
    router.push(`/portal/applications?${next.toString()}`);
  }

  return (
    <div className="portal-surface space-y-4 p-4 md:p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Lloji
          <select
            value={params.get("type") ?? ""}
            onChange={(e) => update("type", e.target.value)}
            className="h-9 min-w-[160px] rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Të gjitha llojet</option>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Statusi
          <select
            value={params.get("status") ?? ""}
            onChange={(e) => update("status", e.target.value)}
            className="h-9 min-w-[160px] rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Të gjitha statuset</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Bashkia
          <select
            value={params.get("municipalityId") ?? ""}
            onChange={(e) => update("municipalityId", e.target.value)}
            className="h-9 min-w-[160px] rounded-md border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Të gjitha bashkitë</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>{m.nameSq}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Nga data
          <input
            type="date"
            value={params.get("dateFrom") ?? ""}
            onChange={(e) => update("dateFrom", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Deri në datë
          <input
            type="date"
            value={params.get("dateTo") ?? ""}
            onChange={(e) => update("dateTo", e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border/80 pt-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={params.get("returned") === "1"}
            onChange={(e) => setPreset(e.target.checked ? "returned" : "")}
          />
          Aplikime të kthyera
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={params.get("rejected") === "1"}
            onChange={(e) => setPreset(e.target.checked ? "rejected" : "")}
          />
          Aplikime të refuzuara
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={params.get("approved") === "1"}
            onChange={(e) => setPreset(e.target.checked ? "approved" : "")}
          />
          Aplikime të miratuara
        </label>
      </div>
    </div>
  );
}

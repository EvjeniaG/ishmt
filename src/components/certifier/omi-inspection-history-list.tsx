"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardCheck, Download } from "lucide-react";
import {
  buildYearFilterOptions,
  RegistryDropdownFilter,
  RegistryEmpty,
  RegistryFilterBar,
} from "@/components/elevators/registry-shared";
import { cn } from "@/lib/utils";

export type OmiInspectionHistoryItem = {
  id: string;
  registryNumber: string;
  buildingAddress?: string | null;
  conductedDate: Date | null;
  result: string | null;
  approvedBodyNumber: string | null;
  examinationType: string | null;
  reportDocument?: { id: string; originalFilename?: string | null } | null;
};

const RESULT_FILTERS = [
  { value: "all", label: "Të gjitha" },
  { value: "PASS", label: "Kalues" },
  { value: "FAIL", label: "Jo kalues" },
] as const;

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("sq-AL") : "-";
}

function formatExaminationType(value: string | null) {
  if (!value) return "-";
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function resultLabel(result: string | null) {
  if (result === "PASS") return "Kalues";
  if (result === "FAIL") return "Jo kalues";
  return result ?? "Në pritje";
}

function resultBadgeClass(result: string | null) {
  if (result === "PASS") return "bg-emerald-600 text-white";
  if (result === "FAIL") return "bg-red-600 text-white";
  return "bg-amber-500 text-white";
}

export function OmiInspectionHistoryList({ items }: { items: OmiInspectionHistoryItem[] }) {
  const [resultFilter, setResultFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [elevatorFilter, setElevatorFilter] = useState("all");

  const elevatorOptions = useMemo(() => {
    const registries = [...new Set(items.map((i) => i.registryNumber))].sort();
    return [
      { value: "all", label: "Të gjitha" },
      ...registries.map((r) => ({ value: r, label: r })),
    ];
  }, [items]);

  const yearOptions = useMemo(
    () => buildYearFilterOptions(items.map((i) => i.conductedDate?.toISOString() ?? null)),
    [items],
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (resultFilter !== "all" && item.result !== resultFilter) return false;
      if (elevatorFilter !== "all" && item.registryNumber !== elevatorFilter) return false;
      if (yearFilter !== "all") {
        const date = item.conductedDate;
        if (!date || new Date(date).getFullYear() !== Number(yearFilter)) return false;
      }
      return true;
    });
  }, [items, resultFilter, yearFilter, elevatorFilter]);

  if (items.length === 0) {
    return (
      <RegistryEmpty
        title="Pa inspektime"
        description="Inspektimet periodike shfaqen këtu pas regjistrimit nga OMI."
      />
    );
  }

  return (
    <div>
      <RegistryFilterBar>
        <RegistryDropdownFilter
          label="Rezultati"
          value={resultFilter}
          onChange={setResultFilter}
          options={[...RESULT_FILTERS]}
        />
        <RegistryDropdownFilter
          label="Ashensori"
          value={elevatorFilter}
          onChange={setElevatorFilter}
          options={elevatorOptions}
        />
        <RegistryDropdownFilter
          label="Viti"
          value={yearFilter}
          onChange={setYearFilter}
          options={yearOptions}
        />
        <p className="ml-auto self-end text-xs tabular-nums text-muted-foreground">
          {filtered.length} / {items.length} regjistrime
        </p>
      </RegistryFilterBar>

      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
          Asnjë inspektim për filtrat e zgjedhur.
        </p>
      ) : (
        <ul className="divide-y divide-border/70">
          {filtered.map((item) => (
            <li key={item.id}>
              <article className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="font-semibold text-foreground">{item.registryNumber}</p>
                    <time className="text-sm text-muted-foreground">{fmtDate(item.conductedDate)}</time>
                  </div>

                  {item.buildingAddress && (
                    <p className="text-sm text-muted-foreground">{item.buildingAddress}</p>
                  )}

                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground/85">
                      {item.approvedBodyNumber ?? "-"}
                    </span>
                    <span className="mx-1.5 text-border/80">·</span>
                    <span>{formatExaminationType(item.examinationType)}</span>
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                      resultBadgeClass(item.result),
                    )}
                  >
                    {resultLabel(item.result)}
                  </span>

                  {item.reportDocument?.id ? (
                    <Link
                      href={`/api/documents/${item.reportDocument.id}/download`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-gov-primary hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      Shkarko raportin
                    </Link>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

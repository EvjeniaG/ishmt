"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MaintenanceRegistryView } from "@/lib/elevators/registry-view-models";
import {
  buildYearFilterOptions,
  DetailRows,
  DocumentDownload,
  fmtDateSq,
  fmtDateTimeSq,
  RegistryDropdownFilter,
  RegistryEmpty,
  RegistryFilterBar,
  StatusPill,
} from "@/components/elevators/registry-shared";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  ROUTINE: "Rutinë",
  ANNUAL_SERVICE: "Vjetor",
  EMERGENCY: "Emergjencë",
  MODERNIZATION: "Modernizim",
};

const TYPE_FILTERS = [
  { value: "all", label: "Të gjitha" },
  { value: "interventions", label: "Ndërhyrje" },
  { value: "monthly", label: "Raporte teknik periodik" },
] as const;

type Filter = (typeof TYPE_FILTERS)[number]["value"];
type MaintenanceRecordItem = MaintenanceRegistryView["records"][number];

function RecordCard({ record, compact }: { record: MaintenanceRecordItem; compact?: boolean }) {
  const typeLabel = record.isMonthlyReport
    ? "Raport teknik periodik"
    : TYPE_LABELS[record.typeLabel] ?? record.typeLabel;

  const detailRows = [
    { label: "Lloji", value: record.interventionLabel },
    { label: "Kategoria", value: typeLabel },
    { label: "Kompania", value: record.companyName },
    { label: "Data", value: fmtDateSq(record.performedDate) },
    ...(record.technicianName ? [{ label: "Tekniku", value: record.technicianName }] : []),
    ...(record.startTime && record.endTime
      ? [{ label: "Orari", value: `${record.startTime} – ${record.endTime}` }]
      : []),
    ...(record.durationMinutes != null
      ? [{ label: "Kohëzgjatja", value: `${record.durationMinutes} min` }]
      : []),
    ...(record.description ? [{ label: "Përshkrimi", value: record.description }] : []),
    ...(record.partsReplaced ? [{ label: "Pjesët e zëvendësuara", value: record.partsReplaced }] : []),
    ...(record.findings ? [{ label: "Vërejtje", value: record.findings }] : []),
    ...(record.nextDueDate ? [{ label: "Afati i radhës", value: fmtDateSq(record.nextDueDate) }] : []),
    { label: "Regjistruar", value: fmtDateTimeSq(record.createdAt) },
  ];

  return (
    <details className="group rounded-lg border border-border/70 bg-card">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden",
          compact ? "px-3 py-2.5" : "items-start gap-3 p-4",
        )}
      >
        {!compact && (
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
              record.isMonthlyReport ? "bg-sky-100 text-sky-700" : "bg-muted text-foreground",
            )}
          >
            {new Date(record.performedDate).toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit" })}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={cn("font-medium leading-snug", compact ? "text-sm" : "text-base")}>
              {record.interventionLabel}
            </p>
            <StatusPill tone={record.isMonthlyReport ? "info" : "neutral"}>{typeLabel}</StatusPill>
          </div>
          <p className="text-xs text-muted-foreground">
            {fmtDateSq(record.performedDate)}
            {compact ? "" : ` · ${record.companyName}`}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 border-t border-border/60 px-3 pb-3 pt-2">
        <DetailRows rows={detailRows} />
        {record.documentId && (
          <DocumentDownload
            documentId={record.documentId}
            label={record.documentName ?? "Shkarko dokumentin PDF"}
          />
        )}
      </div>
    </details>
  );
}

export function MaintenanceRecordsList({
  records,
  compact,
}: {
  records: MaintenanceRecordItem[];
  compact?: boolean;
}) {
  const [typeFilter, setTypeFilter] = useState<Filter>("all");
  const [yearFilter, setYearFilter] = useState("all");

  const yearOptions = useMemo(
    () => buildYearFilterOptions(records.map((record) => record.performedDate)),
    [records],
  );

  const filtered = useMemo(() => {
    return records.filter((record) => {
      if (typeFilter === "interventions" && record.isMonthlyReport) return false;
      if (typeFilter === "monthly" && !record.isMonthlyReport) return false;
      if (yearFilter !== "all" && new Date(record.performedDate).getFullYear() !== Number(yearFilter)) {
        return false;
      }
      return true;
    });
  }, [records, typeFilter, yearFilter]);

  if (records.length === 0) {
    return <RegistryEmpty title="Pa ndërhyrje" description="Regjistrimet shfaqen këtu." />;
  }

  return (
    <div>
      <RegistryFilterBar>
        <RegistryDropdownFilter
          label="Lloji"
          value={typeFilter}
          onChange={(value) => setTypeFilter(value as Filter)}
          options={[...TYPE_FILTERS]}
        />
        <RegistryDropdownFilter
          label="Viti"
          value={yearFilter}
          onChange={setYearFilter}
          options={yearOptions}
        />
        <p className="ml-auto self-end text-xs text-muted-foreground tabular-nums">
          {filtered.length} / {records.length} regjistrime
        </p>
      </RegistryFilterBar>

      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
          Asnjë regjistrim për filtrat e zgjedhur.
        </p>
      ) : (
        <ul className={cn("space-y-1.5", compact ? "p-3 sm:p-4" : "p-4 sm:p-5")}>
          {filtered.map((record) => (
            <li key={record.id}>
              <RecordCard record={record} compact={compact} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

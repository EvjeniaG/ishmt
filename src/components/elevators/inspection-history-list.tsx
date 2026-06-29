"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ClipboardCheck, ShieldAlert } from "lucide-react";
import type { InspectionRegistryView } from "@/lib/elevators/registry-view-models";
import {
  buildYearFilterOptions,
  DetailRows,
  DocumentDownload,
  fmtDateSq,
  RegistryDropdownFilter,
  RegistryEmpty,
  RegistryFilterBar,
  StatusPill,
} from "@/components/elevators/registry-shared";
import { PeriodicInspectionEnrichForm } from "@/components/elevators/periodic-inspection-enrich-form";
import { cn } from "@/lib/utils";

type InspectionItem = InspectionRegistryView["items"][number];

const TYPE_FILTERS = [
  { value: "all", label: "Të gjitha" },
  { value: "PERIODIC", label: "Periodik" },
  { value: "EXTRAORDINARY", label: "Jashtëzakonshme" },
  { value: "INITIAL", label: "Fillestar" },
  { value: "RE_INSPECTION", label: "Rinspektim" },
] as const;

const RESULT_FILTERS = [
  { value: "all", label: "Të gjitha" },
  { value: "PASS", label: "Kalues" },
  { value: "FAIL", label: "Jo kalues" },
  { value: "CONDITIONAL", label: "Me kushte" },
  { value: "PENDING", label: "Në pritje" },
] as const;

function resultTone(item: InspectionItem) {
  if (item.isPass) return "success" as const;
  if (item.isFail) return "danger" as const;
  return "warning" as const;
}

function cardAccent(item: InspectionItem) {
  if (item.isPass) return "border-l-emerald-500 bg-emerald-50/30";
  if (item.isFail) return "border-l-red-500 bg-red-50/20";
  return "border-l-amber-400 bg-amber-50/20";
}

function buildDetailRows(item: InspectionItem) {
  const isPeriodic = item.type === "PERIODIC";
  const nextDate = fmtDateSq(item.nextInspectionDate);
  const rows = [
    { label: "Organi inspektues", value: item.conductedByOrg },
    ...(item.inspectorName ? [{ label: "Inspektor", value: item.inspectorName }] : []),
    { label: "Lloji", value: item.typeLabel },
    { label: "Rezultati", value: item.resultLabel },
    {
      label: isPeriodic ? "Data e inspektimit" : "Data e kryerjes",
      value: fmtDateSq(item.conductedDate ?? item.scheduledDate),
    },
  ];

  if (isPeriodic && item.reportReference) {
    rows.push({ label: "Raporti", value: item.reportReference });
  }

  if (!isPeriodic) {
    rows.push({ label: "Data e planifikuar", value: fmtDateSq(item.scheduledDate) });
    if (nextDate !== "-") {
      rows.push({ label: "Inspektimi i radhës", value: nextDate });
    }
  } else if (nextDate !== "-") {
    rows.push({ label: "Inspektimi i radhës", value: nextDate });
  }

  if (
    item.approvedBodyNumber &&
    item.approvedBodyNumber.trim() !== item.conductedByOrg.trim()
  ) {
    rows.push({ label: "Trupi OM", value: item.approvedBodyNumber });
  }

  if (item.findings?.trim()) {
    rows.push({ label: item.findingsLabel, value: item.findings });
  }

  return rows;
}

function InspectionCard({
  item,
  elevatorId,
  showOmiEnrich,
}: {
  item: InspectionItem;
  elevatorId?: string;
  showOmiEnrich?: boolean;
}) {
  const conducted = fmtDateSq(item.conductedDate ?? item.scheduledDate);
  const tone = resultTone(item);
  const detailRows = buildDetailRows(item);
  const isPeriodic = item.type === "PERIODIC";

  return (
    <details
      className={cn(
        "group overflow-hidden rounded-lg border border-border/70 border-l-4 bg-card shadow-sm transition-shadow hover:shadow-md",
        cardAccent(item),
      )}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            item.isPass && "bg-emerald-100 text-emerald-700",
            item.isFail && "bg-red-100 text-red-700",
            !item.isPass && !item.isFail && "bg-amber-100 text-amber-800",
          )}
        >
          {item.isFail ? (
            <ShieldAlert className="h-5 w-5" aria-hidden />
          ) : (
            <ClipboardCheck className="h-5 w-5" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{item.typeLabel}</p>
            <StatusPill tone={tone}>{item.resultLabel}</StatusPill>
            {item.conductedByOrg === "ISHMT" && (
              <span className="inline-flex rounded-full bg-gov-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gov-primary">
                ISHMT
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{item.conductedByOrg}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{isPeriodic ? "Inspektuar:" : "Kryer:"}</span>{" "}
              {conducted}
            </span>
            {isPeriodic && item.reportReference && (
              <span>
                <span className="font-medium text-foreground">Raporti:</span> {item.reportReference}
              </span>
            )}
            {!isPeriodic && item.nextInspectionDate && fmtDateSq(item.nextInspectionDate) !== "-" && (
              <span>
                <span className="font-medium text-foreground">Radhës:</span>{" "}
                {fmtDateSq(item.nextInspectionDate)}
              </span>
            )}
            {item.hasReport && item.reportDocumentId && (
              <DocumentDownload
                documentId={item.reportDocumentId}
                label="Shkarko dokumentin"
                variant="link"
              />
            )}
          </div>
        </div>

        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-3 border-t border-border/60 bg-background/60 px-4 py-3">
        <DetailRows rows={detailRows} />
        {item.hasReport && (
          <DocumentDownload
            documentId={item.reportDocumentId}
            label="Shkarko dokumentin e inspektimit"
          />
        )}
        {showOmiEnrich && item.canOmiEnrich && elevatorId && (
          <PeriodicInspectionEnrichForm
            inspectionId={item.id}
            elevatorId={elevatorId}
            defaultApprovedBodyNumber={item.approvedBodyNumber}
          />
        )}
      </div>
    </details>
  );
}

export function InspectionHistoryList({
  items,
  elevatorId,
  showOmiEnrich = false,
}: {
  items: InspectionItem[];
  elevatorId?: string;
  showOmiEnrich?: boolean;
}) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");

  const orgOptions = useMemo(() => {
    const orgs = [...new Set(items.map((item) => item.conductedByOrg))].sort();
    return [
      { value: "all", label: "Të gjitha" },
      ...orgs.map((org) => ({ value: org, label: org })),
    ];
  }, [items]);

  const yearOptions = useMemo(
    () =>
      buildYearFilterOptions(
        items.map((item) => item.conductedDate ?? item.scheduledDate),
      ),
    [items],
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (resultFilter !== "all") {
        const result = item.result ?? "PENDING";
        if (result !== resultFilter) return false;
      }
      if (orgFilter !== "all" && item.conductedByOrg !== orgFilter) return false;
      if (yearFilter !== "all") {
        const date = item.conductedDate ?? item.scheduledDate;
        if (!date || new Date(date).getFullYear() !== Number(yearFilter)) return false;
      }
      return true;
    });
  }, [items, typeFilter, resultFilter, orgFilter, yearFilter]);

  if (items.length === 0) {
    return (
      <RegistryEmpty
        title="Pa inspektime"
        description="OMI dhe ISHMT regjistrojnë inspektimet pas kontratës aktive."
      />
    );
  }

  return (
    <div>
      <RegistryFilterBar>
        <RegistryDropdownFilter
          label="Lloji"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[...TYPE_FILTERS]}
        />
        <RegistryDropdownFilter
          label="Rezultati"
          value={resultFilter}
          onChange={setResultFilter}
          options={[...RESULT_FILTERS]}
        />
        <RegistryDropdownFilter
          label="Organi"
          value={orgFilter}
          onChange={setOrgFilter}
          options={orgOptions}
        />
        <RegistryDropdownFilter
          label="Viti"
          value={yearFilter}
          onChange={setYearFilter}
          options={yearOptions}
        />
        <p className="ml-auto self-end text-xs text-muted-foreground tabular-nums">
          {filtered.length} / {items.length} regjistrime
        </p>
      </RegistryFilterBar>

      {filtered.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
          Asnjë inspektim për filtrat e zgjedhur.
        </p>
      ) : (
        <ul className="space-y-2 p-4 sm:p-5">
          {filtered.map((item) => (
            <li key={item.id}>
              <InspectionCard item={item} elevatorId={elevatorId} showOmiEnrich={showOmiEnrich} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

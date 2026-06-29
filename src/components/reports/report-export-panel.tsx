"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/shared/institutional";
import type { ReportDefinition, ReportId } from "@/lib/reports/report-catalog";

type MunicipalityOption = { id: string; nameSq: string };

export function ReportExportPanel({
  reports,
  municipalities,
}: {
  reports: ReportDefinition[];
  municipalities: MunicipalityOption[];
}) {
  const [reportId, setReportId] = useState<ReportId>(reports[0]?.id ?? "elevators");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);

  const selected = useMemo(
    () => reports.find((r) => r.id === reportId) ?? reports[0],
    [reports, reportId],
  );

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function download(format: "csv" | "pdf") {
    if (!selected) return;
    setBusy(format);
    const params = new URLSearchParams({ report: selected.id, format });
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    window.location.href = `/api/reports/export?${params.toString()}`;
    window.setTimeout(() => setBusy(null), 1500);
  }

  if (reports.length === 0) {
    return (
      <SectionCard title="Nuk ka raporte" subtitle="Nuk keni raporte të disponueshme për rolin tuaj" padded>
        <p className="text-sm text-muted-foreground">Kontaktoni administratorin nëse mendoni se kjo është gabim.</p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Zgjidh raportin" subtitle="Raportet e gatshme sipas rolit tuaj" padded>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="reportType">Lloji i raportit</Label>
            <select
              id="reportType"
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              value={reportId}
              onChange={(e) => {
                setReportId(e.target.value as ReportId);
                setFilters({});
              }}
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            {selected && (
              <p className="text-xs text-muted-foreground">{selected.description}</p>
            )}
          </div>
        </div>
      </SectionCard>

      {selected && selected.filters.length > 0 && (
        <SectionCard title="Filtrat" subtitle="Përshtatni të dhënat para shkarkimit" padded>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selected.filters.map((filter) => {
              if (filter.key === "municipalityId") {
                return (
                  <div key={filter.key} className="space-y-1">
                    <Label htmlFor={filter.key}>{filter.label}</Label>
                    <select
                      id={filter.key}
                      className="flex h-10 w-full rounded-md border px-3 text-sm"
                      value={filters[filter.key] ?? ""}
                      onChange={(e) => setFilter(filter.key, e.target.value)}
                    >
                      <option value="">Të gjitha</option>
                      {municipalities.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nameSq}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (filter.type === "date") {
                return (
                  <div key={filter.key} className="space-y-1">
                    <Label htmlFor={filter.key}>{filter.label}</Label>
                    <input
                      id={filter.key}
                      type="date"
                      className="flex h-10 w-full rounded-md border px-3 text-sm"
                      value={filters[filter.key] ?? ""}
                      onChange={(e) => setFilter(filter.key, e.target.value)}
                    />
                  </div>
                );
              }

              return (
                <div key={filter.key} className="space-y-1">
                  <Label htmlFor={filter.key}>{filter.label}</Label>
                  <select
                    id={filter.key}
                    className="flex h-10 w-full rounded-md border px-3 text-sm"
                    value={filters[filter.key] ?? ""}
                    onChange={(e) => setFilter(filter.key, e.target.value)}
                  >
                    <option value="">Të gjitha</option>
                    {filter.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Shkarko" subtitle="CSV për Excel ose PDF për printim / arkivim" padded>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => download("csv")} disabled={busy !== null}>
            {busy === "csv" ? "Duke shkarkuar…" : "Shkarko CSV"}
          </Button>
          <Button type="button" variant="outline" onClick={() => download("pdf")} disabled={busy !== null}>
            {busy === "pdf" ? "Duke gjeneruar…" : "Shkarko PDF"}
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

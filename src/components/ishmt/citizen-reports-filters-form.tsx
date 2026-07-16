import Link from "next/link";
import { CitizenReportStatus, CitizenReportType, ReportPriority } from "@prisma/client";
import {
  CITIZEN_REPORT_STATUS_LABELS,
  CITIZEN_REPORT_TYPE_LABELS,
  REPORT_PRIORITY_LABELS,
} from "@/lib/registration/report-labels";
import {
  buildCitizenReportsFilterHref,
  type CitizenReportFilters,
} from "@/lib/ishmt/citizen-report-filters";

type CitizenReportsFiltersFormProps = {
  filters: CitizenReportFilters;
};

export function CitizenReportsFiltersForm({ filters }: CitizenReportsFiltersFormProps) {
  return (
    <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
      <input
        name="q"
        defaultValue={filters.q ?? ""}
        placeholder="Kërko numër, ashensor, përshkrim…"
        className="flex h-10 rounded-md border px-3 text-sm lg:col-span-2"
      />
      <select name="type" defaultValue={filters.type ?? ""} className="flex h-10 rounded-md border px-3 text-sm">
        <option value="">Të gjitha llojet</option>
        {Object.values(CitizenReportType).map((type) => (
          <option key={type} value={type}>
            {CITIZEN_REPORT_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <select
        name="status"
        defaultValue={filters.status ?? ""}
        className="flex h-10 rounded-md border px-3 text-sm"
      >
        <option value="">Të gjitha statuset</option>
        {Object.values(CitizenReportStatus).map((status) => (
          <option key={status} value={status}>
            {CITIZEN_REPORT_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <select
        name="priority"
        defaultValue={filters.priority ?? ""}
        className="flex h-10 rounded-md border px-3 text-sm"
      >
        <option value="">Të gjitha prioritetet</option>
        {Object.values(ReportPriority).map((priority) => (
          <option key={priority} value={priority}>
            {REPORT_PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>
      <div className="flex flex-wrap items-center gap-2 lg:col-span-5">
        <button type="submit" className="rounded-md bg-gov-primary px-4 py-2 text-sm text-white">
          Filtro
        </button>
        {(filters.q || filters.type || filters.status || filters.priority) && (
          <Link href="/ishmt/reports" className="text-sm text-primary hover:underline">
            Pastro filtrat
          </Link>
        )}
      </div>
    </form>
  );
}

export function citizenReportsFilterSummary(filters: CitizenReportFilters): string | null {
  const parts: string[] = [];
  if (filters.q) parts.push(`«${filters.q}»`);
  if (filters.type) parts.push(CITIZEN_REPORT_TYPE_LABELS[filters.type]);
  if (filters.status) parts.push(CITIZEN_REPORT_STATUS_LABELS[filters.status]);
  if (filters.priority) parts.push(REPORT_PRIORITY_LABELS[filters.priority]);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export { buildCitizenReportsFilterHref };

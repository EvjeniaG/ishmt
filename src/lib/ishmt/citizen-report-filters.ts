import { CitizenReportStatus, CitizenReportType, ReportPriority } from "@prisma/client";
import {
  CITIZEN_REPORT_ACTIVE_STATUSES,
  CITIZEN_REPORT_CLOSED_STATUSES,
} from "@/lib/ishmt/citizen-report-queue";

export type CitizenReportFilters = {
  q?: string;
  type?: CitizenReportType;
  status?: CitizenReportStatus;
  priority?: ReportPriority;
};

export function parseCitizenReportFilters(
  params: Record<string, string | undefined>,
): CitizenReportFilters {
  const type = params.type as CitizenReportType | undefined;
  const status = params.status as CitizenReportStatus | undefined;
  const priority = params.priority as ReportPriority | undefined;

  return {
    q: params.q?.trim() || undefined,
    type: type && type in CitizenReportType ? type : undefined,
    status: status && status in CitizenReportStatus ? status : undefined,
    priority: priority && priority in ReportPriority ? priority : undefined,
  };
}

export function resolveCitizenReportStatusBuckets(filters: CitizenReportFilters): {
  active: CitizenReportStatus[];
  closed: CitizenReportStatus[];
} {
  if (!filters.status) {
    return {
      active: CITIZEN_REPORT_ACTIVE_STATUSES,
      closed: CITIZEN_REPORT_CLOSED_STATUSES,
    };
  }

  if (CITIZEN_REPORT_ACTIVE_STATUSES.includes(filters.status)) {
    return { active: [filters.status], closed: [] };
  }

  if (CITIZEN_REPORT_CLOSED_STATUSES.includes(filters.status)) {
    return { active: [], closed: [filters.status] };
  }

  return {
    active: CITIZEN_REPORT_ACTIVE_STATUSES,
    closed: CITIZEN_REPORT_CLOSED_STATUSES,
  };
}

export function buildCitizenReportsFilterHref(filters: CitizenReportFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  const query = params.toString();
  return query ? `/ishmt/reports?${query}` : "/ishmt/reports";
}

export function citizenReportFiltersAreActive(filters: CitizenReportFilters): boolean {
  return Boolean(filters.q || filters.type || filters.status || filters.priority);
}

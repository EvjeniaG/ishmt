/** Faqja e unifikuar: përmbledhje ditore + kontrata & afatet. */
export const ISHMT_COMPLIANCE_MONITOR_PATH = "/ishmt/compliance-digest";

export type ContractIssueSeverity = "critical" | "warning" | "info";

export type ContractIssueCategory = "missing" | "expired" | "expiring" | "pending";

export type ContractIssueListFilters = {
  issue?: string;
  issueCategory?: ContractIssueCategory;
  municipalityId?: string;
  severity?: ContractIssueSeverity;
  q?: string;
  expiringWithin?: 7 | 30;
  page?: number;
};

export const CONTRACT_ISSUE_FILTER_OPTIONS = [
  { value: "", label: "Të gjitha llojet e alarmit" },
  { value: "no-maintenance-contract", label: "Pa kontratë mirëmbajtjeje" },
  { value: "no-inspection-contract", label: "Pa kontratë inspektimi (OMI)" },
  { value: "maintenance-contract-expired", label: "Kontrata mirëmbajtjes skaduar" },
  { value: "inspection-contract-expired", label: "Kontrata inspektimit skaduar" },
  { value: "maintenance-contract-expiring", label: "Mirëmbajtje skadon së shpejti" },
  { value: "inspection-contract-expiring", label: "Inspektim skadon së shpejti" },
  { value: "pending-maintenance-contract", label: "Mirëmbajtje në pritje pranimi" },
  { value: "pending-inspection-contract", label: "Inspektim në pritje pranimi" },
] as const;

export const CONTRACT_ISSUE_CATEGORY_OPTIONS = [
  { value: "", label: "Të gjitha kategoritë" },
  { value: "missing", label: "Mungesa kontratash" },
  { value: "expired", label: "Kontrata të skaduara" },
  { value: "expiring", label: "Afat në skadim" },
  { value: "pending", label: "Në pritje pranimi" },
] as const;

export const CONTRACT_SEVERITY_OPTIONS = [
  { value: "", label: "Të gjithë prioritetet" },
  { value: "critical", label: "Kritike" },
  { value: "warning", label: "Monitorim" },
  { value: "info", label: "Info" },
] as const;

export const CONTRACT_EXPIRING_WITHIN_OPTIONS = [
  { value: "", label: "Çdo afat" },
  { value: "7", label: "≤ 7 ditë" },
  { value: "30", label: "≤ 30 ditë" },
] as const;

export const ISSUE_TYPES_BY_CATEGORY: Record<ContractIssueCategory, string[]> = {
  missing: ["no-maintenance-contract", "no-inspection-contract"],
  expired: ["maintenance-contract-expired", "inspection-contract-expired"],
  expiring: ["maintenance-contract-expiring", "inspection-contract-expiring"],
  pending: ["pending-maintenance-contract", "pending-inspection-contract"],
};

export function parseContractIssueFilters(
  params: Record<string, string | undefined>,
): ContractIssueListFilters {
  const expiringRaw = params.expiringWithin;
  const expiringWithin =
    expiringRaw === "7" ? 7 : expiringRaw === "30" ? 30 : undefined;

  const issueCategory = params.issueCategory as ContractIssueCategory | undefined;
  const validCategory =
    issueCategory && issueCategory in ISSUE_TYPES_BY_CATEGORY ? issueCategory : undefined;

  const severity = params.severity as ContractIssueSeverity | undefined;
  const validSeverity =
    severity === "critical" || severity === "warning" || severity === "info"
      ? severity
      : undefined;

  return {
    issue: params.issue?.trim() || undefined,
    issueCategory: validCategory,
    municipalityId: params.municipalityId?.trim() || undefined,
    severity: validSeverity,
    q: params.q?.trim() || undefined,
    expiringWithin,
    page: parseInt(params.page ?? "1", 10) || 1,
  };
}

export function buildContractsFilterHref(
  filters: ContractIssueListFilters,
  overrides?: Partial<ContractIssueListFilters>,
): string {
  const merged = { ...filters, ...overrides };
  const query = new URLSearchParams();

  if (merged.issue) query.set("issue", merged.issue);
  if (merged.issueCategory) query.set("issueCategory", merged.issueCategory);
  if (merged.municipalityId) query.set("municipalityId", merged.municipalityId);
  if (merged.severity) query.set("severity", merged.severity);
  if (merged.q) query.set("q", merged.q);
  if (merged.expiringWithin) query.set("expiringWithin", String(merged.expiringWithin));
  if (merged.page && merged.page > 1) query.set("page", String(merged.page));

  const qs = query.toString();
  return qs
    ? `${ISHMT_COMPLIANCE_MONITOR_PATH}?${qs}`
    : ISHMT_COMPLIANCE_MONITOR_PATH;
}

export function buildContractsExportHref(filters: ContractIssueListFilters): string {
  const href = buildContractsFilterHref({ ...filters, page: 1 });
  const qs = href.includes("?") ? href.split("?")[1]! : "";
  return qs ? `/api/ishmt/contracts/export?${qs}` : "/api/ishmt/contracts/export";
}

export function isContractsSearchParamsChange(prevSearch: string, nextSearch: string): boolean {
  return prevSearch !== nextSearch;
}

export function hasActiveContractFilters(filters: ContractIssueListFilters): boolean {
  return Boolean(
    filters.issue ||
      filters.issueCategory ||
      filters.municipalityId ||
      filters.severity ||
      filters.q ||
      filters.expiringWithin,
  );
}

export function contractFilterSummary(
  filters: ContractIssueListFilters,
  municipalityName?: string,
): string[] {
  const chips: string[] = [];
  if (filters.issue) {
    const label = CONTRACT_ISSUE_FILTER_OPTIONS.find((o) => o.value === filters.issue)?.label;
    chips.push(label ?? filters.issue);
  }
  if (filters.issueCategory) {
    const label = CONTRACT_ISSUE_CATEGORY_OPTIONS.find((o) => o.value === filters.issueCategory)?.label;
    chips.push(label ?? filters.issueCategory);
  }
  if (filters.municipalityId) {
    chips.push(municipalityName ? `Bashkia: ${municipalityName}` : "Bashkia e filtruar");
  }
  if (filters.severity) {
    const label = CONTRACT_SEVERITY_OPTIONS.find((o) => o.value === filters.severity)?.label;
    chips.push(label ?? filters.severity);
  }
  if (filters.expiringWithin) {
    chips.push(`Afat ≤ ${filters.expiringWithin} ditë`);
  }
  if (filters.q) {
    chips.push(`Kërkim: «${filters.q}»`);
  }
  return chips;
}

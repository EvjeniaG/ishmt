import { formatDateSq } from "@/lib/format-date";

export type RequiredActionSeverity = "info" | "warning" | "danger";

export type RequiredActionItem = {
  id: string;
  title: string;
  subtitle: string;
  severity: RequiredActionSeverity;
  href: string;
  actionLabel: string;
  dueDate?: Date | string | null;
  /** Badge statusi aplikimi (list layout). */
  applicationStatus?: string;
  applicationType?: string;
  /** Tekst ndihmës nën nëntitullin. */
  hint?: string;
};

export const REQUIRED_ACTION_SEVERITY_LABELS: Record<RequiredActionSeverity, string> = {
  danger: "Prioritet i lartë",
  warning: "Monitorim",
  info: "Referencë",
};

export const REQUIRED_ACTION_SEVERITY_ORDER: Record<RequiredActionSeverity, number> = {
  danger: 0,
  warning: 1,
  info: 2,
};

export const REQUIRED_ACTION_FILTER_OPTIONS: {
  value: "" | RequiredActionSeverity;
  label: string;
}[] = [
  { value: "", label: "Të gjitha prioritetet" },
  { value: "danger", label: "Prioritet i lartë" },
  { value: "warning", label: "Monitorim" },
  { value: "info", label: "Referencë" },
];

export function sortRequiredActions<T extends { severity: RequiredActionSeverity }>(actions: T[]): T[] {
  return [...actions].sort(
    (a, b) => REQUIRED_ACTION_SEVERITY_ORDER[a.severity] - REQUIRED_ACTION_SEVERITY_ORDER[b.severity],
  );
}

export function filterRequiredActionsBySeverity<T extends { severity: RequiredActionSeverity }>(
  actions: T[],
  filter: "" | RequiredActionSeverity,
): T[] {
  if (!filter) return actions;
  return actions.filter((action) => action.severity === filter);
}

export function formatRequiredActionDueDate(dueDate?: Date | string | null): string {
  return formatDateSq(dueDate ?? null);
}

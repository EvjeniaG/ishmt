import { computeLegalDeadline } from "@/lib/utils/legal-deadline";
import { PROCEDURE_WORKING_DAYS } from "@/lib/deadlines/deadline-policy";
import type { DeadlineSeverity } from "@/lib/deadlines/deadline-service";

const SEVERITY_CLASSES: Record<DeadlineSeverity, string> = {
  red: "bg-red-100 text-red-800 border-red-300",
  orange: "bg-orange-100 text-orange-800 border-orange-300",
  gray: "bg-slate-100 text-slate-700 border-slate-300",
  ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export function LegalDeadlineBadge({
  submittedAt,
  className = "",
  compact = false,
}: {
  submittedAt: Date | string | null | undefined;
  className?: string;
  compact?: boolean;
}) {
  if (!submittedAt) return null;
  const deadline = computeLegalDeadline(new Date(submittedAt), PROCEDURE_WORKING_DAYS);
  const severity: DeadlineSeverity = deadline.severity === "gray" ? "gray" : deadline.severity;

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${SEVERITY_CLASSES[severity]} ${className}`}
      title={`${PROCEDURE_WORKING_DAYS} ditë pune nga protokolli`}
    >
      {compact ? `⏱ ${deadline.workingDaysRemaining}d` : `⏱ ${deadline.label}`}
    </span>
  );
}

export function DeadlineSeverityBadge({
  severity,
  label,
  className = "",
}: {
  severity: DeadlineSeverity;
  label: string;
  className?: string;
}) {
  if (severity === "ok") return null;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${SEVERITY_CLASSES[severity]} ${className}`}
    >
      {label}
    </span>
  );
}

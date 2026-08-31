import { LegalDeadlineBadge } from "@/components/deadlines/deadline-badge";
import { PROCEDURE_WORKING_DAYS } from "@/lib/deadlines/deadline-policy";

export function ProcedureDeadlineNotice({
  submittedAt,
  role,
}: {
  submittedAt: Date | string | null | undefined;
  role: "owner" | "ishmt";
}) {
  if (!submittedAt) return null;

  const ownerText =
    "Aplikimi u protokollua. IQMT ka afat ligjor prej 10 ditëve pune për shqyrtim dhe përgjigje.";
  const ishmtText =
    "Afati maksimal i procedurës: 10 ditë pune nga protokollimi i kërkesës së plotë (Udhëzim IQMT).";

  return (
    <div className="workflow-notice workflow-notice-waiting flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">
          {role === "owner" ? ownerText : ishmtText}
        </p>
        <p className="text-xs text-muted-foreground">
          Protokolli: {new Date(submittedAt).toLocaleDateString("sq-AL")} · Afat: {PROCEDURE_WORKING_DAYS} ditë pune
        </p>
      </div>
      <LegalDeadlineBadge submittedAt={submittedAt} />
    </div>
  );
}

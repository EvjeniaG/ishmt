import { History, MessageSquareText, FileText, Users } from "lucide-react";
import { labelWorkflowAction } from "@/lib/constants/display-labels";
import { roleLabelSq } from "@/lib/permissions/ishmt-roles";
import type { RoleCode } from "@/lib/constants/roles";
import { REVIEW_LEVEL_BY_ACTION } from "@/lib/workflows/application-workflow";
import type { WorkflowAction } from "@/lib/workflows/application-workflow";

type TrailHistoryEntry = {
  id: string;
  action: string;
  comment: string | null;
  createdAt: Date;
  metadata: unknown;
  actor: { firstName: string; lastName: string };
};

type FieldAssignment = {
  id: string;
  reportText: string | null;
  status: string;
  completedAt: Date | null;
  assignedByRole: string | null;
  inspector: { firstName: string; lastName: string };
  assignedBy: { firstName: string; lastName: string };
};

const PHASE1_ACTIONS = new Set([
  "DELEGATE_TO_DIRECTOR",
  "DELEGATE_TO_SECTOR_HEAD",
  "ASSIGN_FIELD_INSPECTORS",
]);

const PHASE2_ACTIONS = new Set([
  "SUBMIT_FIELD_REPORT",
  "FORWARD_TO_DIRECTOR",
  "FORWARD_TO_CHIEF",
  "APPROVE",
  "REJECT",
  "RETURN",
]);

function actorName(actor: { firstName: string; lastName: string }) {
  return `${actor.firstName} ${actor.lastName}`.trim();
}

function reviewLevelLabel(action: string, metadata: unknown): string {
  const meta = metadata as { reviewLevel?: string } | null;
  const level =
    meta?.reviewLevel ??
    REVIEW_LEVEL_BY_ACTION[action as WorkflowAction];
  const roleByLevel: Record<string, RoleCode> = {
    CHIEF: "CHIEF_INSPECTOR",
    DIRECTOR: "ISHMT_DIRECTOR",
    SECTOR_HEAD: "SECTOR_HEAD",
    FIELD_INSPECTOR: "FIELD_INSPECTOR",
  };
  if (level && roleByLevel[level]) {
    return roleLabelSq(roleByLevel[level]);
  }
  return "ISHMT";
}

function formatInspectorList(
  metadata: unknown,
  inspectorNames: Record<string, string>,
): string | null {
  const meta = metadata as { inspectorIds?: string[]; requiresFieldVerification?: boolean } | null;
  const parts: string[] = [];
  if (meta?.requiresFieldVerification) {
    parts.push("Kërkohet verifikim në terren para miratimit.");
  }
  if (meta?.inspectorIds?.length) {
    const names = meta.inspectorIds.map((id) => inspectorNames[id] ?? "Inspektor").join(", ");
    parts.push(`Inspektorët e caktuar: ${names}`);
  }
  return parts.length ? parts.join("\n") : null;
}

function formatDate(value: Date) {
  return new Date(value).toLocaleString("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TrailList({
  entries,
  emptyLabel,
  variant,
}: {
  entries: { id: string; title: string; subtitle: string; body?: string | null; date: Date }[];
  emptyLabel: string;
  variant: "note" | "report";
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const Icon = variant === "note" ? MessageSquareText : FileText;

  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gov-primary" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{entry.title}</p>
              <p className="text-xs text-muted-foreground">
                {entry.subtitle} · {formatDate(entry.date)}
              </p>
              {entry.body?.trim() ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {entry.body}
                </p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function InspectorAssignmentSummary({
  lockedBy,
  plannedInspectorIds,
  inspectorNames,
  fieldAssignments,
}: {
  lockedBy: string | null;
  plannedInspectorIds: string[];
  inspectorNames: Record<string, string>;
  fieldAssignments: FieldAssignment[];
}) {
  const plannedNames = plannedInspectorIds.map((id) => inspectorNames[id] ?? "—");
  const hasAssignments = fieldAssignments.length > 0;
  const hasPlan = plannedNames.length > 0;

  if (!hasPlan && !hasAssignments && !lockedBy) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-gov-primary" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">Caktimi i inspektorëve</h3>
      </div>
      <dl className="space-y-2 text-sm">
        {lockedBy ? (
          <div>
            <dt className="text-muted-foreground">Caktuar / planifikuar nga</dt>
            <dd className="font-medium">{roleLabelSq(lockedBy as RoleCode)}</dd>
          </div>
        ) : null}
        {hasPlan ? (
          <div>
            <dt className="text-muted-foreground">Inspektorët e planifikuar</dt>
            <dd className="font-medium">{plannedNames.join(", ")}</dd>
          </div>
        ) : null}
        {hasAssignments ? (
          <div>
            <dt className="text-muted-foreground">Deleguar për shqyrtim</dt>
            <dd className="space-y-1">
              {fieldAssignments.map((row) => (
                <p key={row.id}>
                  <span className="font-medium">{actorName(row.inspector)}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — nga {roleLabelSq((row.assignedByRole ?? "SECTOR_HEAD") as RoleCode)} (
                    {actorName(row.assignedBy)})
                    {row.status === "PENDING" ? " · në pritje të raportit" : " · raport i dorëzuar"}
                  </span>
                </p>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function IshmtWorkflowTrail({
  history,
  fieldAssignments,
  inspectorNames,
  lockedBy,
  plannedInspectorIds,
}: {
  history: TrailHistoryEntry[];
  fieldAssignments: FieldAssignment[];
  inspectorNames: Record<string, string>;
  lockedBy?: string | null;
  plannedInspectorIds?: string[];
}) {
  const phase1Notes = history
    .filter((entry) => PHASE1_ACTIONS.has(entry.action))
    .map((entry) => {
      const inspectorLine = formatInspectorList(entry.metadata, inspectorNames);
      const body = [entry.comment, inspectorLine].filter(Boolean).join("\n\n") || null;
      return {
        id: entry.id,
        title: labelWorkflowAction(entry.action),
        subtitle: `${reviewLevelLabel(entry.action, entry.metadata)} · ${actorName(entry.actor)}`,
        body,
        date: entry.createdAt,
      };
    });

  const phase2FromHistory = history
    .filter((entry) => PHASE2_ACTIONS.has(entry.action) && entry.action !== "SUBMIT_FIELD_REPORT")
    .map((entry) => ({
      id: entry.id,
      title: labelWorkflowAction(entry.action),
      subtitle: `${reviewLevelLabel(entry.action, entry.metadata)} · ${actorName(entry.actor)}`,
      body: entry.comment,
      date: entry.createdAt,
    }));

  const inspectorReports = fieldAssignments
    .filter((a) => a.reportText?.trim() && a.status === "COMPLETED")
    .map((a) => ({
      id: a.id,
      title: "Raport i inspektorit",
      subtitle: `Inspektor · ${actorName(a.inspector)}`,
      body: a.reportText,
      date: a.completedAt ?? new Date(0),
    }));

  const phase2Reports = [...inspectorReports, ...phase2FromHistory].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const showSummary =
    Boolean(lockedBy) ||
    (plannedInspectorIds?.length ?? 0) > 0 ||
    fieldAssignments.length > 0;

  if (!showSummary && phase1Notes.length === 0 && phase2Reports.length === 0) {
    return null;
  }

  return (
    <section className="workflow-section">
      <div className="workflow-section-header">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-gov-primary" aria-hidden />
          <h2 className="workflow-section-title">Gjurma e shqyrtimit ISHMT</h2>
        </div>
        <p className="workflow-section-desc">
          Caktimi i inspektorëve, shënimet e delegimit dhe raportet e hallkave paraardhëse
        </p>
      </div>
      <div className="workflow-section-body space-y-6">
        {showSummary ? (
          <InspectorAssignmentSummary
            lockedBy={lockedBy ?? null}
            plannedInspectorIds={plannedInspectorIds ?? []}
            inspectorNames={inspectorNames}
            fieldAssignments={fieldAssignments}
          />
        ) : null}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Faza 1 — Shënime delegimi</h3>
          <TrailList
            entries={phase1Notes}
            emptyLabel="Ende nuk ka shënime delegimi nga hallkat e sipërme."
            variant="note"
          />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Faza 2 — Raporte</h3>
          <TrailList
            entries={phase2Reports}
            emptyLabel="Ende nuk ka raporte nga inspektorët ose hallkat e mëparshme."
            variant="report"
          />
        </div>
      </div>
    </section>
  );
}

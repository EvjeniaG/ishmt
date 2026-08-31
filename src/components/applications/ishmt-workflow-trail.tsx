import { History, MessageSquareText, FileText } from "lucide-react";
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
  "UPDATE_PLANNED_INSPECTORS",
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
  return "IQMT";
}

function formatInspectorList(
  action: string,
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
    const label =
      action === "UPDATE_PLANNED_INSPECTORS"
        ? "Plani i përditësuar (atëherë)"
        : action === "ASSIGN_FIELD_INSPECTORS"
          ? "Inspektorët e caktuar"
          : "Plani fillestar i inspektorëve";
    parts.push(`${label}: ${names}`);
  }
  return parts.length ? parts.join("\n\n") : null;
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
}: {
  entries: {
    id: string;
    title: string;
    subtitle: string;
    body?: string | null;
    date: Date;
    variant: "note" | "report";
  }[];
  emptyLabel: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry) => {
        const Icon = entry.variant === "note" ? MessageSquareText : FileText;
        return (
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
        );
      })}
    </ol>
  );
}

export function IshmtWorkflowTrail({
  history,
  fieldAssignments,
  inspectorNames,
  plannedInspectorIds,
}: {
  history: TrailHistoryEntry[];
  fieldAssignments: FieldAssignment[];
  inspectorNames: Record<string, string>;
  lockedBy?: string | null;
  plannedInspectorIds?: string[];
}) {
  const currentInspectorNames =
    plannedInspectorIds
      ?.map((id) => inspectorNames[id])
      .filter(Boolean)
      .join(", ") ?? null;

  const delegationNotes = history
    .filter((entry) => PHASE1_ACTIONS.has(entry.action))
    .map((entry) => {
      const inspectorLine = formatInspectorList(entry.action, entry.metadata, inspectorNames);
      const body = [entry.comment, inspectorLine].filter(Boolean).join("\n\n") || null;
      return {
        id: entry.id,
        title: labelWorkflowAction(entry.action),
        subtitle: `${reviewLevelLabel(entry.action, entry.metadata)} · ${actorName(entry.actor)}`,
        body,
        date: entry.createdAt,
        variant: "note" as const,
      };
    });

  const reportsFromHistory = history
    .filter((entry) => PHASE2_ACTIONS.has(entry.action) && entry.action !== "SUBMIT_FIELD_REPORT")
    .map((entry) => ({
      id: entry.id,
      title: labelWorkflowAction(entry.action),
      subtitle: `${reviewLevelLabel(entry.action, entry.metadata)} · ${actorName(entry.actor)}`,
      body: entry.comment,
      date: entry.createdAt,
      variant: "report" as const,
    }));

  const inspectorReports = fieldAssignments
    .filter((a) => a.reportText?.trim() && a.status === "COMPLETED")
    .map((a) => ({
      id: a.id,
      title: "Raport i inspektorit",
      subtitle: `Inspektor · ${actorName(a.inspector)}`,
      body: a.reportText,
      date: a.completedAt ?? new Date(0),
      variant: "report" as const,
    }));

  const trailEntries = [...delegationNotes, ...reportsFromHistory, ...inspectorReports].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  if (trailEntries.length === 0) {
    return null;
  }

  return (
    <section className="workflow-section">
      <div className="workflow-section-header">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-gov-primary" aria-hidden />
          <h2 className="workflow-section-title">Gjurma e shqyrtimit IQMT</h2>
        </div>
        <p className="workflow-section-desc">
          Shënimet e delegimit dhe raportet e hallkave
        </p>
      </div>
      <div className="workflow-section-body space-y-5">
        {currentInspectorNames ? (
          <p className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-foreground">
            <span className="font-medium">Plani aktual i inspektorëve:</span>{" "}
            {currentInspectorNames}
          </p>
        ) : null}
        <TrailList
          entries={trailEntries}
          emptyLabel="Ende nuk ka shënime ose raporte nga shqyrtimi."
        />
      </div>
    </section>
  );
}

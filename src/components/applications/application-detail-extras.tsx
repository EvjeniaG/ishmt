import Link from "next/link";
import { ArrowUpRight, ChevronDown, History } from "lucide-react";
import { formatWorkflowHistoryLine } from "@/lib/constants/display-labels";
import { WorkflowSection } from "@/components/applications/workflow-section";
import { cn } from "@/lib/utils";
import type { ApplicationStatus } from "@prisma/client";

type HistoryEntry = {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  action: string;
  comment?: string | null;
  createdAt: Date;
};

function formatHistoryTime(createdAt: Date) {
  return new Date(createdAt).toLocaleString("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function HistoryEntryRow({
  entry,
  statusLabels,
  emphasized = false,
}: {
  entry: HistoryEntry;
  statusLabels: Record<string, string>;
  emphasized?: boolean;
}) {
  const title = formatWorkflowHistoryLine({
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    action: entry.action,
    statusLabels: statusLabels as Record<ApplicationStatus, string>,
  });

  return (
    <div
      className={cn(
        "workflow-data-cell",
        emphasized && "border-gov-primary/15 bg-gov-primary/[0.03]",
      )}
    >
      <dt className="workflow-data-label">{title}</dt>
      {entry.comment?.trim() && (
        <dd className="mt-1 text-sm text-muted-foreground">Arsye: {entry.comment.trim()}</dd>
      )}
      <dd className="workflow-data-value mt-1 tabular-nums">
        <time dateTime={new Date(entry.createdAt).toISOString()}>{formatHistoryTime(entry.createdAt)}</time>
      </dd>
    </div>
  );
}

export function ApplicationElevatorCard({
  elevatorId,
  registryNumber,
}: {
  elevatorId: string;
  registryNumber: string;
}) {
  return (
    <Link href={`/portal/elevators/${elevatorId}`} className="workflow-link-card group">
      <div>
        <p className="text-sm font-semibold text-foreground">Dosja e ashensorit</p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{registryNumber}</p>
      </div>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gov-primary/10 text-gov-primary transition-transform group-hover:scale-105">
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}

export function ApplicationHistoryTimeline({
  entries,
  statusLabels,
}: {
  entries: HistoryEntry[];
  statusLabels: Record<string, string>;
}) {
  if (entries.length === 0) return null;

  const [latest, ...older] = entries;

  return (
    <WorkflowSection
      title="Historia"
      description={`${entries.length} ${entries.length === 1 ? "ngjarje" : "ngjarje"} në proces`}
      headerExtra={<History className="h-4 w-4 shrink-0 text-gov-primary" aria-hidden />}
    >
      <div className="space-y-3">
        <HistoryEntryRow entry={latest} statusLabels={statusLabels} emphasized />

        {older.length > 0 && (
          <details className="group border-t border-border/60 pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-gov-primary hover:text-gov-secondary">
              <span>Shfaq {older.length} ngjarje të mëparshme</span>
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <ol className="mt-3 grid gap-3">
              {older.map((entry) => (
                <li key={entry.id}>
                  <HistoryEntryRow entry={entry} statusLabels={statusLabels} />
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </WorkflowSection>
  );
}

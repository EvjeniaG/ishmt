import Link from "next/link";
import { ArrowUpRight, History } from "lucide-react";
import { formatWorkflowHistoryLine } from "@/lib/constants/display-labels";
import type { ApplicationStatus } from "@prisma/client";

type HistoryEntry = {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  action: string;
  createdAt: Date;
};

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

  return (
    <section className="workflow-section">
      <div className="workflow-section-header">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-gov-primary" aria-hidden />
          <h2 className="workflow-section-title">Historia</h2>
        </div>
        <p className="workflow-section-desc">Çfarë ka ndodhur me aplikimin tuaj</p>
      </div>
      <div className="workflow-section-body">
        <ol className="workflow-timeline">
          {entries.map((entry, index) => (
            <li key={entry.id} className="workflow-timeline-item">
              {index < entries.length - 1 && <span className="workflow-timeline-line" aria-hidden />}
              <span className="workflow-timeline-dot" aria-hidden />
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-sm font-medium text-foreground">
                  {formatWorkflowHistoryLine({
                    fromStatus: entry.fromStatus,
                    toStatus: entry.toStatus,
                    action: entry.action,
                    statusLabels,
                  })}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString("sq-AL", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

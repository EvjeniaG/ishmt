import Link from "next/link";
import type { ReactNode } from "react";
import type { TimelineEvent } from "@/lib/services/elevator-timeline-service";

function formatTimelineDate(value: Date) {
  return value.toLocaleString("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TimelineMeta({
  event,
  applicationHref,
}: {
  event: TimelineEvent;
  applicationHref: (applicationId: string) => string;
}) {
  const parts: ReactNode[] = [];

  if (event.actorName) {
    parts.push(<span key="actor">{event.actorName}</span>);
  }

  if (event.description?.trim()) {
    parts.push(<span key="desc">{event.description.trim()}</span>);
  }

  if (parts.length === 0) return null;

  return (
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && <span className="mx-1.5 text-border">·</span>}
          {part}
        </span>
      ))}
    </p>
  );
}

function ApplicationHeader({
  event,
  applicationHref,
}: {
  event: TimelineEvent;
  applicationHref: (applicationId: string) => string;
}) {
  return (
    <div className="border-b border-border/80 pb-2 pt-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {event.applicationTypeLabel}
      </p>
      {event.applicationId && event.applicationNumber ? (
        <Link
          href={applicationHref(event.applicationId)}
          className="mt-0.5 inline-block font-mono text-sm text-foreground hover:underline"
        >
          {event.applicationNumber}
        </Link>
      ) : (
        <p className="mt-0.5 font-mono text-sm text-foreground">{event.applicationNumber}</p>
      )}
    </div>
  );
}

export function ElevatorDossierTimeline({
  events,
  applicationHref = (applicationId) => `/portal/applications/${applicationId}`,
}: {
  events: TimelineEvent[];
  applicationHref?: (applicationId: string) => string;
}) {
  if (events.length === 0) {
    return <p className="py-6 text-sm text-muted-foreground">Nuk ka veprime të regjistruara.</p>;
  }

  let lastApplicationId: string | undefined;

  return (
    <ol className="divide-y divide-border/80">
      {events.map((event) => {
        const showApplicationHeader =
          event.kind === "workflow" &&
          event.applicationId != null &&
          event.applicationId !== lastApplicationId;

        if (showApplicationHeader) {
          lastApplicationId = event.applicationId;
        }

        return (
          <li key={event.id}>
            {showApplicationHeader ? (
              <ApplicationHeader event={event} applicationHref={applicationHref} />
            ) : null}
            <div className="grid gap-1 py-3.5 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-x-6 sm:py-4">
              <time
                dateTime={event.occurredAt.toISOString()}
                className="text-xs tabular-nums text-muted-foreground sm:pt-0.5"
              >
                {formatTimelineDate(event.occurredAt)}
              </time>
              <div className="min-w-0">
                <p className="text-sm leading-snug text-foreground">{event.title}</p>
                <TimelineMeta event={event} applicationHref={applicationHref} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

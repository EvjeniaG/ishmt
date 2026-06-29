import type { TimelineEvent } from "@/lib/services/elevator-timeline-service";

const CATEGORY_LABELS: Record<TimelineEvent["category"], string> = {
  status: "Status",
  ownership: "Pronësia",
  application: "Aplikim",
  inspection: "Inspektim",
  maintenance: "Mirëmbajtje",
  certificate: "Certifikatë",
  audit: "Audit",
};

const CATEGORY_COLORS: Record<TimelineEvent["category"], string> = {
  status: "bg-blue-100 text-blue-800",
  ownership: "bg-purple-100 text-purple-800",
  application: "bg-indigo-100 text-indigo-800",
  inspection: "bg-teal-100 text-teal-800",
  maintenance: "bg-orange-100 text-orange-800",
  certificate: "bg-green-100 text-green-800",
  audit: "bg-gray-100 text-gray-800",
};

export function ElevatorTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Nuk ka ngjarje në kronologji.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[1.6rem] top-1 h-3 w-3 rounded-full bg-gov-primary" />
          <div className="rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[event.category]}`}>
                {CATEGORY_LABELS[event.category]}
              </span>
              <time className="text-xs text-muted-foreground">
                {event.occurredAt.toLocaleString("sq-AL")}
              </time>
            </div>
            <p className="mt-1 font-medium text-sm">{event.title}</p>
            {event.description && (
              <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
            )}
            {event.actorName && (
              <p className="mt-1 text-xs text-muted-foreground">Nga: {event.actorName}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

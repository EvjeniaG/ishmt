import Link from "next/link";
import type { UnifiedDeadlineItem } from "@/lib/deadlines/deadline-service";
import { DeadlineSeverityBadge } from "@/components/deadlines/deadline-badge";

const CATEGORY_LABELS: Record<UnifiedDeadlineItem["category"], string> = {
  procedure: "Procedurë ISHMT",
  inspection: "Inspektim periodik",
  maintenance_contract: "Kontratë mirëmbajtjeje",
  maintenance_report: "Raport mirëmbajtjeje",
  maintenance_missing: "Mirëmbajtje",
  certificate: "Certifikatë",
};

function formatDue(item: UnifiedDeadlineItem) {
  const date = item.dueDate.toLocaleDateString("sq-AL");
  if (item.isOverdue) return `Skaduar · duhej ${date}`;
  if (item.daysRemaining === 0) return `Sot · ${date}`;
  return `${item.daysRemaining} ditë · ${date}`;
}

function severityLabel(item: UnifiedDeadlineItem): string {
  if (item.isOverdue) return "Skaduar";
  if (item.daysRemaining <= 7) return "Urgjente";
  return "Në afat";
}

export function ElevatorDeadlinesCard({ items }: { items: UnifiedDeadlineItem[] }) {
  const visible = items.filter((i) => i.severity !== "ok");
  const display = visible.length > 0 ? visible : items.slice(0, 3);

  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Afatet dhe detyrimet</h3>
        <p className="text-xs text-muted-foreground">
          Inspektim periodik (6/12 muaj) · mirëmbajtje · certifikatë
        </p>
      </div>
      <ul className="divide-y">
        {display.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.title}</span>
                <DeadlineSeverityBadge severity={item.severity} label={severityLabel(item)} />
              </div>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[item.category]} · {item.subtitle}
              </p>
              <p className="text-xs text-muted-foreground">{formatDue(item)}</p>
            </div>
            {item.href && item.actionLabel && (
              <Link href={item.href} className="text-xs font-medium text-gov-primary hover:underline">
                {item.actionLabel} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeadlinesListCompact({ items }: { items: UnifiedDeadlineItem[] }) {
  const urgent = items.filter((i) => i.isOverdue || i.severity === "red" || i.severity === "orange");
  if (urgent.length === 0) return null;

  return (
    <ul className="space-y-2">
      {urgent.slice(0, 8).map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{item.title}</p>
            <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
          </div>
          {item.href ? (
            <Link href={item.href} className="shrink-0 text-xs text-gov-primary hover:underline">
              Shiko
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

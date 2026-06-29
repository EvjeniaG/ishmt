import { AlertTriangle, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStep = {
  id: string;
  label: string;
  detail?: string;
  state: "done" | "current" | "pending" | "alert";
};

const STATE = {
  done: {
    dot: "border-emerald-600 bg-emerald-600 text-white",
    line: "bg-emerald-500/70",
    label: "text-foreground",
    badge: "bg-emerald-50 text-emerald-800",
    badgeText: "Kryer",
  },
  current: {
    dot: "border-gov-primary bg-gov-primary text-white ring-2 ring-gov-primary/20",
    line: "bg-border",
    label: "font-medium text-gov-primary",
    badge: "bg-gov-primary/10 text-gov-primary",
    badgeText: "Aktual",
  },
  pending: {
    dot: "border-border bg-background text-muted-foreground",
    line: "bg-border/80",
    label: "text-muted-foreground",
    badge: "bg-muted/60 text-muted-foreground",
    badgeText: "Pritje",
  },
  alert: {
    dot: "border-red-600 bg-red-600 text-white",
    line: "bg-red-300/70",
    label: "font-medium text-red-800",
    badge: "bg-red-50 text-red-800",
    badgeText: "Alarm",
  },
} as const;

function StepIcon({ state }: { state: PipelineStep["state"] }) {
  if (state === "done") return <Check className="h-3 w-3" strokeWidth={2.5} />;
  if (state === "alert") return <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />;
  if (state === "current") return <Circle className="h-1.5 w-1.5 fill-white" />;
  return <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />;
}

export function PipelineFlowStrip({
  steps,
  title,
  subtitle,
  embedded = false,
}: {
  steps: PipelineStep[];
  title?: string;
  subtitle?: string;
  embedded?: boolean;
}) {
  const track = (
    <div className={cn("portal-tab-scroll", embedded ? "px-3 py-3 sm:px-4" : "px-3 py-4 sm:px-5 sm:py-5")}>
      <ol className="flex w-max min-w-full items-start sm:w-full">
        {steps.map((step, index) => {
          const styles = STATE[step.state];
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;
          const prevDone = index > 0 && steps[index - 1].state === "done";
          const nextDone = step.state === "done";

          return (
            <li
              key={step.id}
              className="flex min-w-[4.75rem] flex-1 flex-col items-center px-0.5 text-center sm:min-w-0"
            >
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "h-px flex-1 rounded-full",
                    isFirst ? "invisible" : prevDone ? STATE.done.line : STATE.pending.line,
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 sm:h-8 sm:w-8",
                    styles.dot,
                  )}
                  aria-hidden
                >
                  <StepIcon state={step.state} />
                </span>
                <span
                  className={cn(
                    "h-px flex-1 rounded-full",
                    isLast ? "invisible" : nextDone ? STATE.done.line : STATE.pending.line,
                  )}
                  aria-hidden
                />
              </div>
              <div className="mt-1.5 w-full px-0.5">
                <p className={cn("text-[11px] leading-tight sm:text-xs", styles.label)}>{step.label}</p>
                {step.detail && (
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{step.detail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );

  if (embedded) return track;

  return (
    <div className="portal-surface overflow-hidden">
      {(title || subtitle) && (
        <div className="border-b border-border/60 px-4 py-2.5 sm:px-5">
          {title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>}
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      {track}
    </div>
  );
}

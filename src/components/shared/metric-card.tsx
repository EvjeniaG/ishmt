import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accentStyles = {
  primary: {
    card: "from-gov-primary/[0.04] to-card border-gov-primary/15",
    dot: "bg-gov-primary",
    value: "text-gov-primary",
  },
  success: {
    card: "from-emerald-500/[0.06] to-card border-emerald-200/60",
    dot: "bg-gov-success",
    value: "text-gov-success",
  },
  warning: {
    card: "from-amber-500/[0.07] to-card border-amber-200/60",
    dot: "bg-gov-warning",
    value: "text-gov-warning",
  },
  danger: {
    card: "from-red-500/[0.06] to-card border-red-200/60",
    dot: "bg-gov-danger",
    value: "text-gov-danger",
  },
} as const;

export function MetricCard({
  label,
  value,
  accent = "primary",
  subtitle,
  compact = false,
  interactive = true,
}: {
  label: string;
  value: number | string;
  accent?: "primary" | "warning" | "danger" | "success";
  subtitle?: React.ReactNode;
  compact?: boolean;
  interactive?: boolean;
}) {
  const styles = accentStyles[accent];

  return (
    <Card
      className={cn(
        interactive ? "portal-surface-interactive" : "portal-surface",
        "overflow-hidden bg-gradient-to-br",
        styles.card,
      )}
    >
      <CardContent className={cn(compact ? "p-3.5" : "p-5")}>
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "font-bold uppercase leading-snug tracking-wider text-muted-foreground",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {label}
          </p>
          <span
            className={cn("shrink-0 rounded-full", compact ? "mt-0.5 h-1.5 w-1.5" : "mt-0.5 h-2 w-2", styles.dot)}
            aria-hidden
          />
        </div>
        <p
          className={cn(
            "font-bold tabular-nums tracking-tight",
            compact ? "mt-1.5 text-xl" : "mt-3 text-3xl",
            styles.value,
          )}
        >
          {value}
        </p>
        {subtitle && (
          <p className={cn("leading-relaxed text-muted-foreground", compact ? "mt-1 text-[11px]" : "mt-2 text-xs")}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

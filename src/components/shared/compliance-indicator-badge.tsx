import { ComplianceIndicator } from "@prisma/client";
import { cn } from "@/lib/utils";

const INDICATOR_CLASS: Record<
  ComplianceIndicator,
  { chip: string; dot: string }
> = {
  GREEN: {
    chip: "compliance-indicator-green",
    dot: "compliance-indicator-dot-green",
  },
  YELLOW: {
    chip: "compliance-indicator-yellow",
    dot: "compliance-indicator-dot-yellow",
  },
  RED: {
    chip: "compliance-indicator-red",
    dot: "compliance-indicator-dot-red",
  },
};

export function ComplianceIndicatorBadge({
  indicator,
  label,
  className,
  title,
  variant = "default",
}: {
  indicator: ComplianceIndicator;
  label: string;
  className?: string;
  title?: string;
  variant?: "default" | "header";
}) {
  const styles = INDICATOR_CLASS[indicator];

  return (
    <span
      className={cn(
        styles.chip,
        variant === "header" && "compliance-indicator-header",
        className,
      )}
      title={title}
      role="status"
      aria-label={label}
    >
      <span className={styles.dot} aria-hidden />
      <span className="min-w-0 flex-1">{label}</span>
    </span>
  );
}

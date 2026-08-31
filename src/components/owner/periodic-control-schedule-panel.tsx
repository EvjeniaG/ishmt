import { Building2, CalendarClock, Layers } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { NEXT_PERIODIC_INSPECTION_LABEL, PERIODIC_INSPECTION_DEADLINE_LABEL } from "@/lib/constants/periodic-inspection-labels";
import type { PeriodicControlSchedule } from "@/lib/elevators/periodic-control-schedule";
import { cn } from "@/lib/utils";

function nextDueAccent(schedule: PeriodicControlSchedule): "success" | "danger" | "warning" {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(schedule.nextInspectionDue);
  due.setHours(0, 0, 0, 0);
  if (due < now) return "danger";
  const daysUntil = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 60) return "warning";
  return "success";
}

function nextDueSubtitle(schedule: PeriodicControlSchedule): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(schedule.nextInspectionDue);
  due.setHours(0, 0, 0, 0);
  if (due < now) return "Afati ka kaluar - caktoni OM-n dhe planifikoni inspektimin";
  const daysUntil = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil === 0) return "Duhet kryer sot";
  if (daysUntil === 1) return "Në 1 ditë";
  if (daysUntil < 60) return `Në ${daysUntil} ditë`;
  return "Sipas regjistrit dhe intervalit ligjor";
}

function ContextChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border/80 bg-background px-3.5 py-3 shadow-sm">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        {label}
      </p>
      <p className="mt-1.5 text-sm font-medium leading-snug text-foreground">{value}</p>
    </div>
  );
}

export function PeriodicControlSchedulePanel({ schedule }: { schedule: PeriodicControlSchedule }) {
  const accent = nextDueAccent(schedule);

  return (
    <section
      className="overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-muted/30 to-card shadow-sm"
      aria-labelledby="periodic-control-schedule-title"
    >
      <div className="flex items-start gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gov-primary/20 bg-gov-primary/5 text-gov-primary">
          <CalendarClock className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 id="periodic-control-schedule-title" className="text-sm font-semibold text-foreground">
            {PERIODIC_INSPECTION_DEADLINE_LABEL}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Intervali dhe data e radhës · Udhëzim IQMT
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            compact
            interactive={false}
            label={NEXT_PERIODIC_INSPECTION_LABEL}
            value={schedule.nextInspectionDueLabel}
            accent={accent}
            subtitle={nextDueSubtitle(schedule)}
          />
          <MetricCard
            compact
            interactive={false}
            label="Intervali ligjor"
            value={`${schedule.intervalMonths} muaj`}
            accent="primary"
            subtitle={schedule.intervalBasisLabel}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <ContextChip
            icon={Building2}
            label="Lloji i ndërtesës"
            value={schedule.buildingTypeLabel}
          />
          <ContextChip
            icon={Layers}
            label="Lloji i ashensorit"
            value={schedule.usagePurposeLabel ?? "Pa specifikim në regjistër"}
          />
        </div>

        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground",
            accent === "danger"
              ? "border-red-200/70 bg-red-50/50"
              : accent === "warning"
                ? "border-amber-200/70 bg-amber-50/40"
                : "border-border/60 bg-muted/20",
          )}
        >
          {schedule.intervalRuleLabel}
        </p>
      </div>
    </section>
  );
}

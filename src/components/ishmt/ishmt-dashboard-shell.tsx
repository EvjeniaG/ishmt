import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { IshmtAlarmBoard } from "@/components/ishmt/ishmt-alarm-board";
import { IshmtDashboardKpi, IshmtDashboardStats } from "@/components/ishmt/ishmt-dashboard-stats";
import { SectionCard } from "@/components/shared/institutional";
import { groupIshmtAlarmsByPriority } from "@/lib/ishmt/dashboard-alarms";
import type { IshmtAlarm } from "@/lib/ishmt/dashboard-alarms";
import type { IshmtDashboardService } from "@/lib/services/ishmt-dashboard-service";

type Metrics = Awaited<ReturnType<typeof IshmtDashboardService.getMetrics>>;

export function IshmtDashboardShell({
  eyebrow,
  alarms,
  metrics,
  alarmsTitle = "Prioritetet operative",
  alarmsSubtitle = "Regjistrime dhe dosje që kërkojnë ndërhyrje - zgjidhni për listën e plotë",
}: {
  eyebrow: string;
  alarms: IshmtAlarm[];
  metrics: Metrics;
  alarmsTitle?: string;
  alarmsSubtitle?: string;
}) {
  const grouped = groupIshmtAlarmsByPriority(alarms);

  return (
    <StandardPageLayout
      eyebrow={eyebrow}
      title="Paneli operativ"
      description="Përmbledhje e regjistrit kombëtar, përputhshmërisë dhe proceseve administrative."
    >
      <IshmtDashboardKpi metrics={metrics} />

      <SectionCard
        title={alarmsTitle}
        subtitle={alarmsSubtitle}
        meta={
          grouped.all.length > 0 ? (
            <span className="portal-badge-warning tabular-nums">
              {grouped.total} prioritete
            </span>
          ) : (
            <span className="portal-badge-success">Pa prioritete aktive</span>
          )
        }
      >
        <IshmtAlarmBoard alarms={alarms} />
      </SectionCard>

      <IshmtDashboardStats metrics={metrics} />
    </StandardPageLayout>
  );
}

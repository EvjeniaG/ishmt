import { IshmtDashboardShell } from "@/components/ishmt/ishmt-dashboard-shell";
import type { IshmtAlarm } from "@/lib/ishmt/dashboard-alarms";
import type { IshmtDashboardService } from "@/lib/services/ishmt-dashboard-service";

type Metrics = Awaited<ReturnType<typeof IshmtDashboardService.getMetrics>>;

export function DirectorDashboard({
  alarms,
  metrics,
}: {
  alarms: IshmtAlarm[];
  metrics: Metrics;
}) {
  return (
    <IshmtDashboardShell
      eyebrow="IQMT · Drejtor i Drejtorisë"
      alarms={alarms}
      metrics={metrics}
      alarmsTitle="Prioritetet operative"
      alarmsSubtitle="Dosje dhe regjistrime që kërkojnë ndërhyrje ose delegim"
    />
  );
}

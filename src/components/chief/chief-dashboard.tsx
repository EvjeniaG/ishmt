import { IshmtDashboardShell } from "@/components/ishmt/ishmt-dashboard-shell";
import type { IshmtAlarm } from "@/lib/ishmt/dashboard-alarms";
import type { IshmtDashboardService } from "@/lib/services/ishmt-dashboard-service";

type Metrics = Awaited<ReturnType<typeof IshmtDashboardService.getMetrics>>;

export function ChiefDashboard({
  alarms,
  metrics,
}: {
  alarms: IshmtAlarm[];
  metrics: Metrics;
}) {
  return (
    <IshmtDashboardShell
      eyebrow="ISHMT · Paneli operativ"
      alarms={alarms}
      metrics={metrics}
      alarmsTitle="Prioritetet operative"
      alarmsSubtitle="Dosje dhe regjistrime që kërkojnë vendim ose ndërhyrje"
    />
  );
}

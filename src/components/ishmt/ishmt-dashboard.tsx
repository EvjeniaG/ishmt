import { IshmtDashboardShell } from "@/components/ishmt/ishmt-dashboard-shell";
import type { IshmtAlarm } from "@/lib/ishmt/dashboard-alarms";
import { roleLabelSq } from "@/lib/permissions/ishmt-roles";
import type { RoleCode } from "@/lib/constants/roles";
import type { IshmtDashboardService } from "@/lib/services/ishmt-dashboard-service";

type Metrics = Awaited<ReturnType<typeof IshmtDashboardService.getMetrics>>;

export function IshmtDashboard({
  alarms,
  metrics,
  roleCode,
}: {
  alarms: IshmtAlarm[];
  metrics: Metrics;
  roleCode: RoleCode;
}) {
  return (
    <IshmtDashboardShell
      eyebrow={`IQMT · ${roleLabelSq(roleCode)}`}
      alarms={alarms}
      metrics={metrics}
    />
  );
}

import { MAINTENANCE_REPORT_MAX_DAYS } from "@/lib/deadlines/deadline-policy";

export const MONTHLY_REPORT_INTERVENTION_TYPE = "RAPORT_MUJOR";

export type MaintenanceComplianceMetrics = {
  lastMaintenanceDate: Date;
  nextDueDate: Date;
  isCompliant: boolean;
  daysOverdue: number;
};

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Llogarit metrikat e mirëmbajtjes nga regjistrimet (ndërhyrje + raport mujor). */
export function computeMaintenanceComplianceMetrics(
  records: Array<{ interventionType: string | null; performedDate: Date }>,
  options?: { now?: Date; maintenanceReportMaxDays?: number },
): MaintenanceComplianceMetrics | null {
  const now = options?.now ?? new Date();
  const maxDays = options?.maintenanceReportMaxDays ?? MAINTENANCE_REPORT_MAX_DAYS;

  const nonMonthly = records.filter(
    (r) => r.interventionType !== MONTHLY_REPORT_INTERVENTION_TYPE,
  );
  const monthlyReports = records.filter(
    (r) => r.interventionType === MONTHLY_REPORT_INTERVENTION_TYPE,
  );

  const lastIntervention = [...nonMonthly].sort(
    (a, b) => b.performedDate.getTime() - a.performedDate.getTime(),
  )[0];
  const lastMonthlyReport = [...monthlyReports].sort(
    (a, b) => b.performedDate.getTime() - a.performedDate.getTime(),
  )[0];

  const lastActivity = lastIntervention ?? lastMonthlyReport;
  if (!lastActivity) return null;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const hasMonthlyReportThisMonth = monthlyReports.some((r) => r.performedDate >= monthStart);

  const lastMaintenanceDate = lastActivity.performedDate;
  const nextDueDate = new Date(lastMaintenanceDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);

  let isCompliant = true;
  let daysOverdue = 0;

  if (lastIntervention) {
    const daysSince = daysBetween(lastIntervention.performedDate, now);
    if (daysSince > maxDays && !hasMonthlyReportThisMonth) {
      isCompliant = false;
      daysOverdue = daysSince - maxDays;
    }
  } else if (!hasMonthlyReportThisMonth) {
    isCompliant = false;
    if (nextDueDate < now) {
      daysOverdue = daysBetween(nextDueDate, now);
    }
  }

  return { lastMaintenanceDate, nextDueDate, isCompliant, daysOverdue };
}

export type IshmtAlarmPriority = "critical" | "urgent" | "warning" | "info";

export type IshmtAlarm = {
  id: string;
  priority: IshmtAlarmPriority;
  label: string;
  hint: string;
  count: number;
  href: string;
};

const PRIORITY_ORDER: Record<IshmtAlarmPriority, number> = {
  critical: 0,
  urgent: 1,
  warning: 2,
  info: 3,
};

export function sortIshmtAlarms(alarms: IshmtAlarm[]): IshmtAlarm[] {
  return [...alarms]
    .filter((a) => a.count > 0)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || b.count - a.count);
}

export function groupIshmtAlarmsByPriority(alarms: IshmtAlarm[]) {
  const active = sortIshmtAlarms(alarms);
  return {
    critical: active.filter((a) => a.priority === "critical"),
    urgent: active.filter((a) => a.priority === "urgent"),
    warning: active.filter((a) => a.priority === "warning"),
    info: active.filter((a) => a.priority === "info"),
    all: active,
    total: active.length,
  };
}

export const ISHMT_ALARM_PRIORITY_LABELS: Record<IshmtAlarmPriority, string> = {
  critical: "Prioritet i lartë",
  urgent: "Prioritet i mesëm",
  warning: "Monitorim",
  info: "Referencë",
};

/** Vijë anësore + badge workflow - pa gradientë të rëndë. */
export const ISHMT_ALARM_ACCENT: Record<IshmtAlarmPriority, string> = {
  critical: "border-l-gov-danger",
  urgent: "border-l-gov-warning",
  warning: "border-l-border",
  info: "border-l-gov-primary",
};

export const ISHMT_ALARM_BADGE: Record<IshmtAlarmPriority, string> = {
  critical: "workflow-status-danger",
  urgent: "workflow-status-waiting",
  warning: "workflow-status-outline",
  info: "workflow-status-action",
};

/** Dritarja kur OM mund të regjistrojë inspektimin periodik (30 ditë para afatit ose pas skadimit). */
export const PERIODIC_INSPECTION_LOG_WINDOW_DAYS = 30;
/** Alarm urgjent për personin përgjegjës, OM dhe IQMT. */
export const PERIODIC_INSPECTION_ALARM_DAYS_BEFORE = 7;
/** Njoftimet e planifikuara para afatit të inspektimit periodik. */
export const PERIODIC_INSPECTION_REMINDER_OFFSETS = [
  PERIODIC_INSPECTION_LOG_WINDOW_DAYS,
  PERIODIC_INSPECTION_ALARM_DAYS_BEFORE,
] as const;

export type PeriodicInspectionWindowInput = {
  now?: Date;
  lastInspection?: {
    conductedDate?: Date | string | null;
    result?: string | null;
    nextInspectionDate?: Date | string | null;
  } | null;
  registrationDate?: Date | string | null;
  intervalMonths?: number | null;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysBetween(from: Date, to: Date): number {
  const start = new Date(from);
  const end = new Date(to);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function resolvePeriodicInspectionNextDue(input: PeriodicInspectionWindowInput): Date | null {
  const last = input.lastInspection;
  const fromRecord = toDate(last?.nextInspectionDate);
  if (fromRecord) return fromRecord;

  const base =
    toDate(last?.conductedDate) ??
    toDate(input.registrationDate);
  if (!base || !input.intervalMonths) return null;

  const next = new Date(base);
  next.setMonth(next.getMonth() + input.intervalMonths);
  return next;
}

export function isPeriodicInspectionLogWindowOpen(input: PeriodicInspectionWindowInput): {
  open: boolean;
  nextDue: Date | null;
  daysRemaining: number;
  overdue: boolean;
} {
  const now = input.now ?? new Date();
  const last = input.lastInspection;

  if (!last?.conductedDate) {
    const nextDue = resolvePeriodicInspectionNextDue(input);
    const daysRemaining = nextDue ? daysBetween(now, nextDue) : 0;
    return {
      open: true,
      nextDue,
      daysRemaining,
      overdue: nextDue ? nextDue < now : false,
    };
  }

  if (last.result === "FAIL") {
    const nextDue = resolvePeriodicInspectionNextDue(input);
    const daysRemaining = nextDue ? daysBetween(now, nextDue) : 0;
    return {
      open: true,
      nextDue,
      daysRemaining,
      overdue: true,
    };
  }

  const nextDue = resolvePeriodicInspectionNextDue(input);
  if (!nextDue) {
    return { open: true, nextDue: null, daysRemaining: 0, overdue: false };
  }

  const daysRemaining = daysBetween(now, nextDue);
  const overdue = daysRemaining < 0;
  const open = overdue || daysRemaining <= PERIODIC_INSPECTION_LOG_WINDOW_DAYS;

  return { open, nextDue, daysRemaining, overdue };
}

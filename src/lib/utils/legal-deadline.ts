/**
 * Afati 10 ditë pune pas protokollimit (Udhëzim ISHMT p.6, 9, 14, 17; Ligji Nr. 44/2015).
 */

import { PROCEDURE_WORKING_DAYS } from "@/lib/deadlines/deadline-policy";

export type LegalDeadline = {
  deadlineDate: Date;
  workingDaysRemaining: number;
  severity: "red" | "orange" | "gray";
  label: string;
};

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function addWorkingDays(start: Date, workingDays: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < workingDays) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) added += 1;
  }
  return d;
}

function workingDaysBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  const cursor = new Date(from);
  let count = 0;
  while (cursor < to) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isWeekend(cursor)) count += 1;
  }
  return count;
}

export function computeLegalDeadline(
  submittedAt: Date,
  workingDays = PROCEDURE_WORKING_DAYS,
): LegalDeadline {
  const deadlineDate = addWorkingDays(submittedAt, workingDays);
  const now = new Date();
  const remaining = workingDaysBetween(now, deadlineDate);

  let severity: LegalDeadline["severity"] = "gray";
  if (remaining <= 3) severity = "red";
  else if (remaining <= 7) severity = "orange";

  const label =
    now > deadlineDate
      ? `Afati ka skaduar (${workingDays} ditë pune nga protokolli)`
      : `Afati: ${remaining} ditë pune mbetur (${workingDays} ditë pune nga protokolli)`;

  return { deadlineDate, workingDaysRemaining: remaining, severity, label };
}

export { PROCEDURE_WORKING_DAYS };

export function computeProcedureDeadline(protocolAt: Date): LegalDeadline {
  return computeLegalDeadline(protocolAt, PROCEDURE_WORKING_DAYS);
}

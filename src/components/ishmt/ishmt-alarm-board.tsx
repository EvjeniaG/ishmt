import Link from "next/link";
import {
  ISHMT_ALARM_BADGE,
  ISHMT_ALARM_PRIORITY_LABELS,
  sortIshmtAlarms,
  type IshmtAlarm,
} from "@/lib/ishmt/dashboard-alarms";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { cn } from "@/lib/utils";

export function IshmtAlarmBoard({ alarms }: { alarms: IshmtAlarm[] }) {
  const sorted = sortIshmtAlarms(alarms);

  if (sorted.length === 0) {
    return (
      <PortalEmptyState>
        Nuk ka prioritete aktive. Proceset administrative dhe regjistri janë në përputhje me afatet e
        përcaktuara.
      </PortalEmptyState>
    );
  }

  return (
    <PortalTableWrap>
      <thead>
        <tr>
          <th className="w-36">Prioriteti</th>
          <th>Përshkrimi</th>
          <th className="w-20 text-right">Raste</th>
          <th className="w-24"></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((alarm) => (
          <tr key={alarm.id}>
            <td>
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  ISHMT_ALARM_BADGE[alarm.priority],
                )}
              >
                {ISHMT_ALARM_PRIORITY_LABELS[alarm.priority]}
              </span>
            </td>
            <td>
              <p className="font-medium text-foreground">{alarm.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{alarm.hint}</p>
            </td>
            <td className="text-right text-lg font-bold tabular-nums">{alarm.count}</td>
            <td>
              <Link href={alarm.href} className="portal-table-link">
                Hap listën
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </PortalTableWrap>
  );
}

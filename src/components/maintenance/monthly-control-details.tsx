import {
  formatMonthlyControlChecklistRows,
  formatMonthlyControlSummary,
  parseMonthlyControlPayload,
} from "@/lib/maintenance/monthly-control-payload";

export function MonthlyControlDetails({ findings }: { findings: string | null | undefined }) {
  const payload = parseMonthlyControlPayload(findings);
  if (!payload) return null;

  const rows = formatMonthlyControlChecklistRows(findings);

  return (
    <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
      <p className="text-sm font-medium">
        {formatMonthlyControlSummary(findings)}
      </p>
      <ul className="grid gap-1.5 text-xs sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.label} className="flex items-start justify-between gap-2 border-b border-border/40 pb-1">
            <span className="text-muted-foreground">{row.label}</span>
            <span
              className={
                row.status === "Jo konforme"
                  ? "font-medium text-red-700"
                  : row.status === "Konforme"
                    ? "font-medium text-green-700"
                    : "text-foreground"
              }
            >
              {row.status}
            </span>
          </li>
        ))}
      </ul>
      {payload.observations && (
        <p className="text-xs">
          <span className="font-medium">Vërejtjet:</span> {payload.observations}
        </p>
      )}
      {payload.notes && (
        <p className="text-xs">
          <span className="font-medium">Shënime:</span> {payload.notes}
        </p>
      )}
    </div>
  );
}

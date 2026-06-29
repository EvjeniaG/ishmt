/** SSR-safe Albanian calendar date (DD.MM.YYYY). Uses UTC for @db.Date values. */
export function formatDateSq(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

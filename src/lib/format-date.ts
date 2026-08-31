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

/** SSR-safe date and time (DD.MM.YYYY, HH:MM). Uses UTC. */
export function formatDateTimeSq(value: string | Date | null | undefined): string {
  if (value == null || value === "") return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${formatDateSq(d)}, ${hours}:${minutes}`;
}

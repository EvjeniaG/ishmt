export type ExportColumn = { key: string; label: string };

export type ExportRow = Record<string, string | number | null>;

export function buildCsv(columns: ExportColumn[], rows: ExportRow[]): string {
  const escape = (value: string) => {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => escape(String(row[c.key] ?? ""))).join(","),
  );

  return `\uFEFF${[header, ...body].join("\n")}`;
}

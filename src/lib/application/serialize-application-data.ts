/** Konverton fushat Prisma (Decimal, Date) në vlera të transferueshme te Client Components. */
export function serializeApplicationDataForClient<
  T extends Record<string, unknown> | null | undefined,
>(data: T): T {
  if (!data) return data;

  const out: Record<string, unknown> = { ...data };

  for (const [key, value] of Object.entries(out)) {
    if (value === null || value === undefined) continue;

    if (value instanceof Date) {
      out[key] = value.toISOString();
      continue;
    }

    if (
      typeof value === "object" &&
      "toFixed" in value &&
      typeof (value as { toFixed: (n: number) => string }).toFixed === "function" &&
      !(value instanceof Date)
    ) {
      out[key] = Number(value);
      continue;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      out[key] = serializeApplicationDataForClient(value as Record<string, unknown>);
    }
  }

  return out as T;
}

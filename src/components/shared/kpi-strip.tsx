import { cn } from "@/lib/utils";

export type KpiItem = {
  label: string;
  value: number | string;
  emphasis?: boolean;
};

export function KpiStrip({ items, columns = 4 }: { items: KpiItem[]; columns?: 2 | 3 | 4 }) {
  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/40",
        colClass,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="bg-card px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <p
            className={cn(
              "mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-foreground",
              item.emphasis && "text-gov-danger",
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

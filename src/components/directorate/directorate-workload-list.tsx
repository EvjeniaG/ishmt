import Link from "next/link";
import { SectionCard } from "@/components/shared/institutional";
import { PortalEmptyState } from "@/components/shared/portal-table";

export function DirectorateWorkloadList({
  title,
  emptyMessage,
  items,
  moreHref,
}: {
  title: string;
  emptyMessage: string;
  items: { id: string; name: string; nipt: string | null; count: number; suffix: string }[];
  moreHref?: string;
}) {
  return (
    <SectionCard
      title={title}
      actions={
        moreHref && items.length > 0 ? (
          <Link href={moreHref} className="text-sm text-gov-primary hover:underline">
            Shiko të gjitha →
          </Link>
        ) : undefined
      }
      padded
    >
      {items.length === 0 ? (
        <PortalEmptyState>{emptyMessage}</PortalEmptyState>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
            >
              <div>
                <Link
                  href={`/directorate/companies/${item.id}`}
                  className="font-medium text-gov-primary hover:underline"
                >
                  {item.name}
                </Link>
                {item.nipt && <p className="text-xs text-muted-foreground">{item.nipt}</p>}
              </div>
              <span className="shrink-0 rounded-full bg-gov-primary/10 px-2.5 py-0.5 text-xs font-semibold text-gov-primary">
                {item.count} {item.suffix}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

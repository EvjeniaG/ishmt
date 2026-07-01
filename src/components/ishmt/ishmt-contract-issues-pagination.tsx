"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function IshmtContractIssuesPagination({
  page,
  totalPages,
  total,
  pageSize,
  prevHref,
  nextHref,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  prevHref?: string;
  nextHref?: string;
}) {
  const router = useRouter();
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  function go(href: string) {
    router.push(href, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-gov-surface/50 px-4 py-3">
      <p className="text-xs text-muted-foreground tabular-nums">
        {rangeStart}–{rangeEnd} nga {total} raste
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!prevHref}
          onClick={() => prevHref && go(prevHref)}
          className={cn(
            "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium",
            prevHref
              ? "border-border bg-card hover:bg-muted/50"
              : "cursor-not-allowed border-border/50 text-muted-foreground/50",
          )}
        >
          ← Mbrapa
        </button>
        <span className="min-w-[5.5rem] text-center text-xs font-medium tabular-nums text-foreground">
          Faqja {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={!nextHref}
          onClick={() => nextHref && go(nextHref)}
          className={cn(
            "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium",
            nextHref
              ? "border-border bg-card hover:bg-muted/50"
              : "cursor-not-allowed border-border/50 text-muted-foreground/50",
          )}
        >
          Para →
        </button>
      </div>
    </div>
  );
}

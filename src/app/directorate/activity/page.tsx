import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateActivityFilters } from "@/components/directorate/directorate-activity-filters";
import { DirectorateActivityList } from "@/components/directorate/directorate-activity-list";
import { DirectoratePageShell } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { requireDirectoratePage } from "@/lib/directorate/access";
import {
  DirectorateActivityService,
  parseCompanyActivityFilters,
  serializeCompanyActivityQuery,
} from "@/lib/services/directorate-activity-service";

export default async function DirectorateActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireDirectoratePage();
  const params = await searchParams;
  const filters = parseCompanyActivityFilters(params);
  const returnQuery = serializeCompanyActivityQuery(params);

  const [items, filterOptions] = await Promise.all([
    DirectorateActivityService.listCompanyActivity(filters),
    DirectorateActivityService.getFilterOptions(),
  ]);

  return (
    <AppShell title="Aktiviteti i kompanive">
      <DirectoratePageShell
        title="Aktiviteti i kompanive"
        description="Çdo ashensor ose aplikim ku janë të përfshira kompanitë instaluese ose certifikuese / OM."
      >
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg border bg-muted/30" />}>
          <DirectorateActivityFilters
            companies={filterOptions.companies}
            municipalities={filterOptions.municipalities}
          />
        </Suspense>

        <SectionCard
          title="Lista e aktivitetit"
          meta={
            <span className="text-sm tabular-nums text-muted-foreground">
              {items.length} {items.length === 1 ? "skedë" : "skeda"}
            </span>
          }
          padded
        >
          <DirectorateActivityList items={items} returnQuery={returnQuery} />
        </SectionCard>
      </DirectoratePageShell>
    </AppShell>
  );
}

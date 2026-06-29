import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateActivityFilters } from "@/components/directorate/directorate-activity-filters";
import { DirectorateElevatorSheet } from "@/components/directorate/directorate-elevator-sheet";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { PortalEmptyState } from "@/components/shared/portal-table";
import { requireDirectoratePage } from "@/lib/directorate/access";
import {
  DirectorateActivityService,
  parseCompanyActivityFilters,
} from "@/lib/services/directorate-activity-service";

export default async function DirectorateActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireDirectoratePage();
  const params = await searchParams;
  const filters = parseCompanyActivityFilters(params);

  const [items, filterOptions] = await Promise.all([
    DirectorateActivityService.listCompanyActivity(filters),
    DirectorateActivityService.getFilterOptions(),
  ]);

  return (
    <AppShell title="Aktiviteti i kompanive">
      <div className="space-y-6">
        <DirectoratePageHeader
          title="Aktiviteti i kompanive"
          description="Skeda e plotë e çdo ashensori / aplikimi ku janë të përfshira kompanitë instaluese ose certifikuese."
        />

        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg border bg-muted/30" />}>
          <DirectorateActivityFilters
            companies={filterOptions.companies}
            municipalities={filterOptions.municipalities}
          />
        </Suspense>

        <SectionCard
          title="Skedat e aktivitetit"
          meta={
            <span className="text-sm tabular-nums text-muted-foreground">
              {items.length} {items.length === 1 ? "skedë" : "skeda"} të gjetura
            </span>
          }
          padded
        >
          {items.length === 0 ? (
            <PortalEmptyState>Nuk u gjet asnjë aktivitet për filtrat e zgjedhur.</PortalEmptyState>
          ) : (
            <div className="space-y-6">
              {items.map((app) => (
                <DirectorateElevatorSheet key={app.id} app={app} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}

import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { CitizenReportsList } from "@/components/ishmt/citizen-reports-list";
import {
  CitizenReportsFiltersForm,
  citizenReportsFilterSummary,
} from "@/components/ishmt/citizen-reports-filters-form";
import { getAuthSession } from "@/lib/auth";
import {
  parseCitizenReportFilters,
  resolveCitizenReportStatusBuckets,
} from "@/lib/ishmt/citizen-report-filters";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { CitizenReportService } from "@/lib/services/citizen-report-service";

export default async function CitizenReportsQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.REPORTS_VIEW)) {
    redirect("/unauthorized");
  }

  const rawParams = await searchParams;
  const filters = parseCitizenReportFilters(rawParams);
  const { active: activeStatuses, closed: closedStatuses } = resolveCitizenReportStatusBuckets(filters);
  const listFilters = {
    type: filters.type,
    priority: filters.priority,
    query: filters.q,
  };

  const [activeReports, closedReports] = await Promise.all([
    activeStatuses.length > 0
      ? CitizenReportService.listForReview({ statuses: activeStatuses, ...listFilters })
      : Promise.resolve([]),
    closedStatuses.length > 0
      ? CitizenReportService.listForReview({ statuses: closedStatuses, ...listFilters })
      : Promise.resolve([]),
  ]);

  const filterSummary = citizenReportsFilterSummary(filters);

  return (
    <AppShell title="Raportimet e qytetarëve">
      <StandardPageLayout
        eyebrow="ISHMT · Raportime publike"
        title="Raportimet e qytetarëve"
        description="Raportime publike për probleme sigurie dhe ashensorë të paregjistruar"
      >
        <SectionCard
          title="Kërko dhe filtro"
          subtitle={
            filterSummary
              ? `Filtrat aktivë: ${filterSummary}`
              : "Kërko sipas numrit, ashensorit, përshkrimit ose statusit"
          }
          padded
        >
          <CitizenReportsFiltersForm filters={filters} />
        </SectionCard>

        {(activeStatuses.length > 0 || activeReports.length > 0) && (
          <SectionCard
            title="Radha e shqyrtimit"
            subtitle="Raportime që presin shqyrtim, caktim ose hetim"
            meta={
              <span className="portal-badge-neutral tabular-nums">{activeReports.length} raportime</span>
            }
            padded
          >
            <CitizenReportsList
              reports={activeReports}
              variant="active"
              emptyMessage={
                filterSummary
                  ? "Nuk ka raportime aktive për këto filtra."
                  : "Nuk ka raportime në radhë."
              }
            />
          </SectionCard>
        )}

        {(closedStatuses.length > 0 || closedReports.length > 0) && (
          <SectionCard
            title="Regjistri i raportimeve të zgjidhura"
            subtitle="Raportimet e mbyllura me shënim zgjidhjeje"
            meta={
              <span className="portal-badge-neutral tabular-nums">{closedReports.length} raportime</span>
            }
            padded
          >
            <CitizenReportsList
              reports={closedReports}
              variant="closed"
              emptyMessage={
                filterSummary
                  ? "Nuk ka raportime të mbyllura për këto filtra."
                  : "Nuk ka raportime të zgjidhura ende."
              }
            />
          </SectionCard>
        )}
      </StandardPageLayout>
    </AppShell>
  );
}

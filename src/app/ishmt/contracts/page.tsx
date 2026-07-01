import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { OfficialTableFooter, SectionCard } from "@/components/shared/institutional";
import { IshmtContractFiltersForm } from "@/components/ishmt/ishmt-contract-filters-form";
import { IshmtContractListToolbar } from "@/components/ishmt/ishmt-contract-list-toolbar";
import {
  IshmtContractIssuesTable,
  IshmtContractOverview,
  IshmtContractStatsPanel,
} from "@/components/ishmt/ishmt-contract-monitor-panel";
import { getAuthSession } from "@/lib/auth";
import {
  buildContractsFilterHref,
  parseContractIssueFilters,
} from "@/lib/ishmt/contract-issue-filters";
import { IshmtContractMonitorService } from "@/lib/services/ishmt-contract-monitor-service";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import { db } from "@/lib/db";

export default async function IshmtContractsMonitorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isIshmtStaffRole(session.user.roleCode)) redirect("/unauthorized");

  const rawParams = await searchParams;
  const filters = parseContractIssueFilters(rawParams);

  const [stats, issuesPage, municipalities] = await Promise.all([
    IshmtContractMonitorService.getNationalStats(),
    IshmtContractMonitorService.listIssues(filters),
    db.geoMunicipality.findMany({
      where: { isActive: true },
      orderBy: { nameSq: "asc" },
      select: { id: true, nameSq: true },
    }),
  ]);

  const prevHref =
    issuesPage.page > 1
      ? buildContractsFilterHref(filters, { page: issuesPage.page - 1 })
      : undefined;
  const nextHref =
    issuesPage.page < issuesPage.totalPages
      ? buildContractsFilterHref(filters, { page: issuesPage.page + 1 })
      : undefined;

  return (
    <AppShell title="Kontratat & afatet">
      <StandardPageLayout
        eyebrow="ISHMT · Monitorim operativ"
        title="Kontratat dhe afatet ligjore"
        description="Filtroni sipas llojit të alarmit, bashkisë, prioritetit dhe afatit."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/ishmt/search"
              className="inline-flex h-10 items-center rounded-md border border-gov-primary px-4 text-sm font-medium text-gov-primary hover:bg-gov-primary/5"
            >
              Regjistri kombëtar
            </Link>
          </div>
        }
      >
        <IshmtContractOverview stats={stats} filterBase={filters} />

        <SectionCard
          title="Treguesit kombëtarë"
          subtitle="Përmbledhje statistikore e regjistrit kombëtar"
          padded
        >
          <IshmtContractStatsPanel stats={stats} filters={filters} />
        </SectionCard>

        <div id="alarmet-lista">
          <SectionCard
            title="Lista e alarmeve"
            meta={
              <span className="portal-badge-neutral tabular-nums">
                {issuesPage.total} raste
                {issuesPage.totalPages > 1 && ` · faqja ${issuesPage.page}/${issuesPage.totalPages}`}
              </span>
            }
            padded
          >
            <div className="mb-5 space-y-4">
              <IshmtContractFiltersForm
                filters={filters}
                municipalities={municipalities}
                embedded
              />
              <IshmtContractListToolbar
                filters={filters}
                total={issuesPage.total}
                searchParams={rawParams}
              />
            </div>

            <IshmtContractIssuesTable
              issues={issuesPage.items}
              total={issuesPage.total}
              page={issuesPage.page}
              pageSize={issuesPage.pageSize}
              totalPages={issuesPage.totalPages}
              prevHref={prevHref}
              nextHref={nextHref}
            />
            <OfficialTableFooter total={issuesPage.total} />
          </SectionCard>
        </div>
      </StandardPageLayout>
    </AppShell>
  );
}

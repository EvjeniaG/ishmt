import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { IshmtComplianceMonitorPanel } from "@/components/ishmt/ishmt-compliance-monitor-panel";
import { IshmtContractFiltersForm } from "@/components/ishmt/ishmt-contract-filters-form";
import { IshmtContractListToolbar } from "@/components/ishmt/ishmt-contract-list-toolbar";
import {
  IshmtContractIssuesTable,
} from "@/components/ishmt/ishmt-contract-monitor-panel";
import { OfficialTableFooter, SectionCard } from "@/components/shared/institutional";
import { ROLE_CODES } from "@/lib/constants/roles";
import { getAuthSession } from "@/lib/auth";
import {
  buildContractsFilterHref,
  parseContractIssueFilters,
} from "@/lib/ishmt/contract-issue-filters";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import { IshmtComplianceDigestService } from "@/lib/services/ishmt-compliance-digest-service";
import { IshmtContractMonitorService } from "@/lib/services/ishmt-contract-monitor-service";
import { db } from "@/lib/db";

const DIGEST_NOTIFY_ROLES = [
  ROLE_CODES.CHIEF_INSPECTOR,
  ROLE_CODES.ISHMT_DIRECTOR,
  ROLE_CODES.SECTOR_HEAD,
  ROLE_CODES.ADMIN,
] as const;

export default async function IshmtComplianceDigestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isIshmtStaffRole(session.user.roleCode)) redirect("/unauthorized");

  const rawParams = await searchParams;
  const filters = parseContractIssueFilters(rawParams);
  const canNotify = (DIGEST_NOTIFY_ROLES as readonly string[]).includes(session.user.roleCode);

  const snapshotPromise = IshmtComplianceDigestService.getSnapshot();

  const [snapshot, stats, issuesPage, municipalities, sectionNotifyStatus] = await Promise.all([
    snapshotPromise,
    IshmtContractMonitorService.getNationalStats(),
    IshmtContractMonitorService.listIssues(filters),
    db.geoMunicipality.findMany({
      where: { isActive: true },
      orderBy: { nameSq: "asc" },
      select: { id: true, nameSq: true },
    }),
    canNotify
      ? snapshotPromise.then((currentSnapshot) =>
          IshmtComplianceDigestService.getHighlightSectionNotifyStatus(currentSnapshot),
        )
      : Promise.resolve(undefined),
  ]);

  const matchedElevator =
    issuesPage.total === 0 && filters.q
      ? await IshmtContractMonitorService.findActiveElevatorBySearchQuery(filters.q)
      : null;

  const prevHref =
    issuesPage.page > 1
      ? buildContractsFilterHref(filters, { page: issuesPage.page - 1 })
      : undefined;
  const nextHref =
    issuesPage.page < issuesPage.totalPages
      ? buildContractsFilterHref(filters, { page: issuesPage.page + 1 })
      : undefined;

  return (
    <AppShell title="Përmbledhje ditore">
      <StandardPageLayout
        eyebrow="IQMT · Monitorim"
        title="Përmbledhje ditore e përputhshmërisë"
        description="Kontrata, afate ligjore dhe mungesa QR në një vend. Çdo ditë merrni njoftim; nga këtu njoftoni me një klik pronarët dhe kompanitë përkatëse."
        actions={
          <Link
            href="/ishmt/search"
            className="inline-flex h-10 items-center rounded-md border border-gov-primary px-4 text-sm font-medium text-gov-primary hover:bg-gov-primary/5"
          >
            Regjistri kombëtar
          </Link>
        }
      >
        <IshmtComplianceMonitorPanel
          snapshot={snapshot}
          stats={stats}
          filters={filters}
          canNotify={canNotify}
          sectionNotifyStatus={sectionNotifyStatus}
        />

        <div id="alarmet-lista" className="scroll-mt-6">
          <SectionCard
            title="Lista e alarmeve"
            subtitle="Filtroni sipas llojit të alarmit, bashkisë, prioritetit dhe afatit"
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
              matchedElevator={matchedElevator}
              searchQuery={filters.q}
            />
            <OfficialTableFooter total={issuesPage.total} />
          </SectionCard>
        </div>
      </StandardPageLayout>
    </AppShell>
  );
}

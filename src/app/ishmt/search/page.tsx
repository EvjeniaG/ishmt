import Link from "next/link";
import { redirect } from "next/navigation";
import { ComplianceIndicator, ElevatorStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { NationalSearchResults } from "@/components/ishmt/national-search-results";
import { OfficialTableFooter, SectionCard } from "@/components/shared/institutional";
import { ComplianceService } from "@/lib/services/compliance-service";
import { getAuthSession } from "@/lib/auth";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { IshmtSearchService } from "@/lib/services/ishmt-search-service";
import { db } from "@/lib/db";
import { canApproveApplications } from "@/lib/permissions/ishmt-roles";
import { ROLE_CODES } from "@/lib/constants/roles";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import { labelElevatorStatus } from "@/lib/constants/display-labels";

export default async function NationalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    compliance?: string;
    municipalityId?: string;
    page?: string;
  }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isIshmtStaffRole(session.user.roleCode)) redirect("/unauthorized");

  const params = await searchParams;
  const ctx = await requireAuthForPage();
  const page = parseInt(params.page ?? "1", 10) || 1;
  const isChief = canApproveApplications(session.user.roleCode);

  const municipalities = await db.geoMunicipality.findMany({
    where: { isActive: true },
    orderBy: { nameSq: "asc" },
    select: { id: true, nameSq: true },
  });

  const result = await IshmtSearchService.searchElevators(ctx, {
    query: params.q,
    status: params.status as ElevatorStatus | undefined,
    compliance: params.compliance as ComplianceIndicator | undefined,
    municipalityId: params.municipalityId,
    page,
  });

  const pageTitle = isChief ? "Regjistri i ashensorëve" : "Kërkim kombëtar i regjistrit";

  return (
    <AppShell title={pageTitle}>
      <StandardPageLayout
        eyebrow="ISHMT · Regjistri kombëtar"
        title={pageTitle}
        description="Kërko sipas numrit të regjistrit, serialit, adresës, personit përgjegjës të ashensorit ose certifikatës. Hap dosjen e plotë digjitale për çdo ashensor."
        actions={
          session.user.roleCode === ROLE_CODES.ADMIN ? (
            <a
              href="/api/admin/register-export"
              className="inline-flex h-10 items-center rounded-md border border-gov-primary px-4 text-sm font-medium text-gov-primary hover:bg-gov-primary/5"
            >
              Eksporto regjistrin (Excel)
            </a>
          ) : undefined
        }
      >
        <SectionCard title="Filtro" subtitle="Kriteret e kërkimit në regjistër" padded>
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Kërko…"
              className="flex h-10 rounded-md border px-3 text-sm md:col-span-2"
            />
            <select name="status" defaultValue={params.status ?? ""} className="flex h-10 rounded-md border px-3 text-sm">
              <option value="">Të gjitha statuset</option>
              {Object.values(ElevatorStatus).map((s) => (
                <option key={s} value={s}>{labelElevatorStatus(s)}</option>
              ))}
            </select>
            <select name="compliance" defaultValue={params.compliance ?? ""} className="flex h-10 rounded-md border px-3 text-sm">
              <option value="">Përputhshmëria</option>
              {Object.values(ComplianceIndicator).map((c) => (
                <option key={c} value={c}>{ComplianceService.getLabel(c)}</option>
              ))}
            </select>
            <select name="municipalityId" defaultValue={params.municipalityId ?? ""} className="flex h-10 rounded-md border px-3 text-sm md:col-span-2">
              <option value="">Të gjitha bashkitë</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>{m.nameSq}</option>
              ))}
            </select>
            <button type="submit" className="rounded-md bg-gov-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Kërko
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Rezultatet"
          subtitle="Ashensorët që përputhen me kriteret e kërkimit"
          meta={
            <span className="portal-badge-neutral tabular-nums">{result.total} regjistrime</span>
          }
          padded
        >
          <NationalSearchResults elevators={result.items} total={result.total} page={result.page} />
          {result.total > result.pageSize && (
            <div className="mt-4 flex gap-2">
              {page > 1 && (
                <Link
                  href={`/ishmt/search?${new URLSearchParams({ ...params, page: String(page - 1) } as Record<string, string>).toString()}`}
                  className="text-sm text-gov-primary hover:underline"
                >
                  ← Faqja e mëparshme
                </Link>
              )}
              {page * result.pageSize < result.total && (
                <Link
                  href={`/ishmt/search?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>).toString()}`}
                  className="text-sm text-gov-primary hover:underline"
                >
                  Faqja tjetër →
                </Link>
              )}
            </div>
          )}
          <OfficialTableFooter total={result.total} />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

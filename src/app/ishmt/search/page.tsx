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
import {
  IshmtSearchService,
  type ComplianceGapFilter,
} from "@/lib/services/ishmt-search-service";
import { db } from "@/lib/db";
import { canApproveApplications } from "@/lib/permissions/ishmt-roles";
import { ROLE_CODES } from "@/lib/constants/roles";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import { labelElevatorStatus } from "@/lib/constants/display-labels";

function canAccessNationalSearch(roleCode: string) {
  return (
    isIshmtStaffRole(roleCode as typeof ROLE_CODES.FIELD_INSPECTOR) ||
    roleCode === ROLE_CODES.DIRECTORATE ||
    roleCode === ROLE_CODES.INSPECTOR
  );
}

const COMPLIANCE_GAP_LABELS: Record<ComplianceGapFilter, string> = {
  "missing-inspection": "Mungesë kontrolli të regjistruar",
  "missing-maintenance-company": "Mungesë kompanie mirëmbajtjeje",
  "missing-maintenance-record": "Mungesë regjistrimi mirëmbajtjeje",
};

export default async function NationalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    compliance?: string;
    complianceGap?: string;
    municipalityId?: string;
    missingQrPlacement?: string;
    page?: string;
  }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!canAccessNationalSearch(session.user.roleCode)) redirect("/unauthorized");

  const params = await searchParams;
  const ctx = await requireAuthForPage();
  const page = parseInt(params.page ?? "1", 10) || 1;
  const isChief = canApproveApplications(session.user.roleCode);
  const missingQrPlacement = params.missingQrPlacement === "1";
  const complianceGap = params.complianceGap as ComplianceGapFilter | undefined;
  const complianceGapLabel =
    complianceGap && complianceGap in COMPLIANCE_GAP_LABELS
      ? COMPLIANCE_GAP_LABELS[complianceGap as ComplianceGapFilter]
      : null;

  const municipalities = await db.geoMunicipality.findMany({
    where: { isActive: true },
    orderBy: { nameSq: "asc" },
    select: { id: true, nameSq: true },
  });

  const result = await IshmtSearchService.searchElevators(ctx, {
    query: params.q,
    status: params.status as ElevatorStatus | undefined,
    compliance: params.compliance as ComplianceIndicator | undefined,
    complianceGap:
      complianceGap && complianceGap in COMPLIANCE_GAP_LABELS
        ? (complianceGap as ComplianceGapFilter)
        : undefined,
    municipalityId: params.municipalityId,
    missingQrPlacement,
    page,
  });

  const pageTitle = isChief ? "Regjistri i ashensorëve" : "Kërkim kombëtar i regjistrit";

  const exportQuery = new URLSearchParams();
  if (params.q) exportQuery.set("q", params.q);
  if (params.status) exportQuery.set("status", params.status);
  if (params.compliance) exportQuery.set("compliance", params.compliance);
  if (params.complianceGap) exportQuery.set("complianceGap", params.complianceGap);
  if (params.municipalityId) exportQuery.set("municipalityId", params.municipalityId);
  if (missingQrPlacement) exportQuery.set("missingQrPlacement", "1");
  const exportHref = `/api/ishmt/registry-export?${exportQuery.toString()}`;

  return (
    <AppShell title={pageTitle}>
      <StandardPageLayout
        eyebrow="IQMT · Regjistri kombëtar"
        title={pageTitle}
        description="Kërko sipas numrit të regjistrit, serialit, adresës, personit përgjegjës të ashensorit ose certifikatës. Hap dosjen e plotë digjitale për çdo ashensor."
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={exportHref}
              className="inline-flex h-10 items-center rounded-md bg-gov-primary px-4 text-sm font-medium text-white hover:opacity-90"
            >
              Shkarko Excel ({result.total} regjistrime)
            </a>
            {session.user.roleCode === ROLE_CODES.ADMIN && (
              <a
                href="/api/admin/register-export"
                className="inline-flex h-10 items-center rounded-md border border-gov-primary px-4 text-sm font-medium text-gov-primary hover:bg-gov-primary/5"
              >
                Eksport i plotë (Aneks 1)
              </a>
            )}
          </div>
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
            {params.complianceGap && (
              <input type="hidden" name="complianceGap" value={params.complianceGap} />
            )}
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                name="missingQrPlacement"
                value="1"
                defaultChecked={missingQrPlacement}
                className="rounded border"
              />
              Pa foto vendosjeje QR (personi përgjegjës nuk e ka dokumentuar)
            </label>
            <button type="submit" className="rounded-md bg-gov-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Kërko
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Rezultatet"
          subtitle={
            complianceGapLabel
              ? `Lista e ashensorëve: ${complianceGapLabel}`
              : missingQrPlacement
                ? "Ashensorë pa foto vendosjeje QR ose pa kod QR"
                : params.compliance
                  ? `Indikatori: ${ComplianceService.getLabel(params.compliance as ComplianceIndicator)}`
                  : "Ashensorët që përputhen me kriteret e kërkimit"
          }
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

import Link from "next/link";
import { Suspense } from "react";
import { OrgStatus, OrgType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DirectorateCompaniesFilters } from "@/components/directorate/directorate-companies-filters";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageShell } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { DIRECTORATE_COMPANY_TABS } from "@/lib/directorate/directorate-nav";
import { requireDirectorateOrAdminReadonly } from "@/lib/directorate/access";
import { OrganizationService } from "@/lib/services/organization-service";

export default async function DirectorateCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; q?: string }>;
}) {
  const { readOnly } = await requireDirectorateOrAdminReadonly();
  const params = await searchParams;

  const typeFilter =
    params.type === OrgType.INSTALLER || params.type === OrgType.CERTIFIER
      ? params.type
      : undefined;

  const statusFilter = Object.values(OrgStatus).includes(params.status as OrgStatus)
    ? (params.status as OrgStatus)
    : undefined;

  const companies = await OrganizationService.listLicensedCompanies({
    type: typeFilter,
    status: statusFilter,
    search: params.q,
  });

  return (
    <AppShell title={readOnly ? "Kompanitë (lexim)" : "Regjistri i kompanive"}>
      <DirectoratePageShell
        title="Regjistri i kompanive"
        description={
          readOnly
            ? "Akses vetëm për lexim - mbikëqyrje IQMT mbi kompanitë e licencuara."
            : "Kompanitë me funksion instalimi ose OM të autorizuara nga Drejtoría e Politikave."
        }
        actions={
          !readOnly ? (
            <Button asChild>
              <Link href="/directorate/companies/new">Shto kompani</Link>
            </Button>
          ) : undefined
        }
        tabs={DIRECTORATE_COMPANY_TABS}
      >
        <Suspense fallback={<div className="h-24 animate-pulse rounded-lg border bg-muted/30" />}>
          <DirectorateCompaniesFilters />
        </Suspense>

        <SectionCard
          title="Lista e kompanive"
          subtitle="Instalues dhe subjekte OM të regjistruara në Drejtorí"
          meta={
            <span className="text-sm tabular-nums text-muted-foreground">
              {companies.length} {companies.length === 1 ? "kompani" : "kompanitë"}
            </span>
          }
          padded
        >
          <DirectorateCompaniesTable companies={companies} />
        </SectionCard>
      </DirectoratePageShell>
    </AppShell>
  );
}

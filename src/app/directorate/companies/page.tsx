import Link from "next/link";
import { Suspense } from "react";
import { OrgStatus, OrgType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DirectorateCompaniesFilters } from "@/components/directorate/directorate-companies-filters";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
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
      <div className="space-y-6">
        <DirectoratePageHeader
          title="Regjistri i plotë i kompanive"
          description={
            readOnly
              ? "Akses vetëm për lexim - mbikëqyrje ISHMT"
              : "Të gjitha kompanitë instaluese dhe certifikuese të regjistruara."
          }
          actions={
            !readOnly ? (
              <Button asChild>
                <Link href="/directorate/companies/new">Shto kompani</Link>
              </Button>
            ) : undefined
          }
        />

        <Suspense fallback={<div className="h-24 animate-pulse rounded-lg border bg-muted/30" />}>
          <DirectorateCompaniesFilters />
        </Suspense>

        <SectionCard
          title="Lista e kompanive"
          meta={
            <span className="text-sm tabular-nums text-muted-foreground">
              {companies.length} {companies.length === 1 ? "kompani" : "kompanitë"} të gjetura
            </span>
          }
        >
          <DirectorateCompaniesTable companies={companies} />
        </SectionCard>
      </div>
    </AppShell>
  );
}

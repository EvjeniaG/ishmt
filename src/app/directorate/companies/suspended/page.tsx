import { OrgStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageShell } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { DIRECTORATE_COMPANY_TABS } from "@/lib/directorate/directorate-nav";
import { requireDirectorateOrAdminReadonly } from "@/lib/directorate/access";
import { OrganizationService } from "@/lib/services/organization-service";

export default async function DirectorateSuspendedCompaniesPage() {
  await requireDirectorateOrAdminReadonly();
  const companies = await OrganizationService.listLicensedCompanies({
    status: OrgStatus.SUSPENDED,
  });

  return (
    <AppShell title="Kompani të pezulluara">
      <DirectoratePageShell
        title="Kompani të pezulluara"
        description="Subjektet që nuk shfaqen më në zgjedhje për aplikime të reja derisa të riaktivizohen."
        tabs={DIRECTORATE_COMPANY_TABS}
      >
        <SectionCard
          title="Lista e pezullimeve"
          meta={
            <span className="text-sm tabular-nums text-muted-foreground">
              {companies.length} {companies.length === 1 ? "kompani" : "kompanitë"}
            </span>
          }
          padded
        >
          <DirectorateCompaniesTable companies={companies} emptyMessage="Nuk ka kompani të pezulluara." />
        </SectionCard>
      </DirectoratePageShell>
    </AppShell>
  );
}

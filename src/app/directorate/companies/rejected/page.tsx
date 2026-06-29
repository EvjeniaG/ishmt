import { OrgStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { requireDirectorateOrAdminReadonly } from "@/lib/directorate/access";
import { OrganizationService } from "@/lib/services/organization-service";

export default async function DirectorateRejectedCompaniesPage() {
  await requireDirectorateOrAdminReadonly();
  const companies = await OrganizationService.listLicensedCompanies({
    status: OrgStatus.REJECTED,
  });

  return (
    <AppShell title="Kompani të refuzuara">
      <div className="space-y-6">
        <DirectoratePageHeader
          title="Kompani të refuzuara"
          description="Kompanitë instaluese dhe certifikuese me status të refuzuar."
        />
        <SectionCard title="Lista e kompanive të refuzuara">
          <DirectorateCompaniesTable
            companies={companies}
            emptyMessage="Nuk ka kompani të refuzuara."
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}

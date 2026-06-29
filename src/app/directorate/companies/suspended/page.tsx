import { OrgStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { requireDirectorateOrAdminReadonly } from "@/lib/directorate/access";
import { OrganizationService } from "@/lib/services/organization-service";

export default async function DirectorateSuspendedCompaniesPage() {
  await requireDirectorateOrAdminReadonly();
  const companies = await OrganizationService.listLicensedCompanies({
    status: OrgStatus.SUSPENDED,
  });

  return (
    <AppShell title="Kompani të pezulluara">
      <div className="space-y-6">
        <DirectoratePageHeader
          title="Kompani të pezulluara"
          description="Kompanitë instaluese dhe certifikuese me status të pezulluar."
        />
        <SectionCard title="Lista e kompanive të pezulluara">
          <DirectorateCompaniesTable
            companies={companies}
            emptyMessage="Nuk ka kompani të pezulluara."
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}

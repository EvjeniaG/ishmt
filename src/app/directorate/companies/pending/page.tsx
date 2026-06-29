import { OrgStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { requireDirectorateOrAdminReadonly } from "@/lib/directorate/access";
import { OrganizationService } from "@/lib/services/organization-service";

export default async function DirectoratePendingCompaniesPage() {
  await requireDirectorateOrAdminReadonly();
  const companies = await OrganizationService.listLicensedCompanies({
    status: OrgStatus.PENDING_VALIDATION,
  });

  return (
    <AppShell title="Kompani në pritje">
      <div className="space-y-6">
        <DirectoratePageHeader
          title="Kompani në pritje"
          description="Kompanitë instaluese dhe certifikuese që presin validim nga Drejtoria."
        />
        <SectionCard title="Lista e kompanive në pritje">
          <DirectorateCompaniesTable
            companies={companies}
            emptyMessage="Nuk ka kompani në pritje të validimit."
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}

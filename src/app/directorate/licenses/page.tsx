import { OrgStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { requireDirectorateOrAdminReadonly } from "@/lib/directorate/access";
import { OrganizationService } from "@/lib/services/organization-service";

export default async function DirectorateLicensesPage() {
  await requireDirectorateOrAdminReadonly();
  const companies = await OrganizationService.listLicensedCompanies({
    status: OrgStatus.ACTIVE,
  });

  const withLicense = companies.filter((c) => c.licenses.length > 0);
  const sorted = [...withLicense].sort(
    (a, b) => a.licenses[0]!.expiryDate.getTime() - b.licenses[0]!.expiryDate.getTime(),
  );

  return (
    <AppShell title="Licencat / autorizimet">
      <div className="space-y-6">
        <DirectoratePageHeader
          title="Licencat / autorizimet"
          description="Licencat aktive të kompanive instaluese dhe certifikuese, të renditura sipas datës së skadimit."
        />
        <SectionCard title="Licencat aktive">
          <DirectorateCompaniesTable
            companies={sorted}
            emptyMessage="Nuk ka licenca aktive të regjistruara."
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}

import { OrgStatus, OrgType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { DirectorateWorkloadList } from "@/components/directorate/directorate-workload-list";
import { SectionCard } from "@/components/shared/institutional";
import { requireDirectorateOrAdminReadonly } from "@/lib/directorate/access";
import { DirectorateDashboardService } from "@/lib/services/directorate-dashboard-service";
import { OrganizationService } from "@/lib/services/organization-service";

export default async function DirectorateCertifiersPage() {
  await requireDirectorateOrAdminReadonly();

  const [companies, workload] = await Promise.all([
    OrganizationService.listLicensedCompanies({
      type: OrgType.CERTIFIER,
      status: OrgStatus.ACTIVE,
    }),
    DirectorateDashboardService.getCertifierWorkload(),
  ]);

  return (
    <AppShell title="Certifikuese të autorizuara">
      <div className="space-y-6">
        <DirectoratePageHeader
          title="Certifikuese të autorizuara"
          description="Kompanitë OM / certifikuese me status aktiv dhe licencë të vlefshme."
        />
        <DirectorateWorkloadList
          title="Ngarkesa aktuale"
          items={workload.map((row) => ({
            id: row.org!.id,
            name: row.org!.name,
            nipt: row.org!.nipt,
            count: row.count,
            suffix: "certifikime aktive",
          }))}
          emptyMessage="Asnjë certifikues nuk ka punë aktive."
        />
        <SectionCard title="Regjistri i certifikuesve">
          <DirectorateCompaniesTable
            companies={companies}
            emptyMessage="Nuk ka kompani certifikuese të autorizuara."
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { OrgStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import {
  CompanyIssueLicenseSection,
  CompanyLicenseOverview,
  CompanyLicensesTable,
} from "@/components/directorate/company-licenses-panel";
import { DirectoratePageShell } from "@/components/directorate/directorate-page-header";
import { OrgStatusBadge } from "@/components/directorate/org-status-badge";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";
import { directorateCompanyDetailTabs } from "@/lib/directorate/directorate-nav";
import { OrganizationService } from "@/lib/services/organization-service";
import { LicenseService } from "@/lib/services/license-service";

export default async function CompanyLicensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const isDirectorate = session.user.roleCode === ROLE_CODES.DIRECTORATE;
  const isAdminReadOnly = session.user.roleCode === ROLE_CODES.ADMIN;
  if (!isDirectorate && !isAdminReadOnly) redirect("/unauthorized");

  const { id } = await params;
  const company = await OrganizationService.getById(id);
  if (!company) notFound();

  const licenses = await LicenseService.listByOrganization(id);
  const now = new Date();
  const hasValidLicense = (type: string) =>
    licenses.some(
      (license) =>
        license.licenseType === type &&
        license.status !== OrgStatus.REVOKED &&
        license.expiryDate >= now,
    );

  const missingOm = !hasValidLicense("CERTIFICATION");
  const missingInstall = !hasValidLicense("INSTALLATION");

  return (
    <AppShell title={`Licencat · ${company.name}`}>
      <DirectoratePageShell
        title={company.name}
        description={company.nipt ? `NIPT ${company.nipt}` : undefined}
        actions={
          <Link href="/directorate/companies" className="text-sm font-medium text-gov-primary hover:underline">
            ← Regjistri
          </Link>
        }
        tabs={directorateCompanyDetailTabs(id)}
      >
        <SectionCard
          title="Përmbledhje"
          subtitle="Numrat e licencës u jepen kompanisë për portalin"
          meta={<OrgStatusBadge status={company.status} />}
          padded
        >
          <CompanyLicenseOverview licenses={licenses} />
        </SectionCard>

        <SectionCard
          title="Licencat e regjistruara"
          meta={
            <span className="text-sm tabular-nums text-muted-foreground">
              {licenses.length} {licenses.length === 1 ? "licencë" : "licenca"}
            </span>
          }
          padded
        >
          <CompanyLicensesTable licenses={licenses} canManage={isDirectorate} />
        </SectionCard>

        {isDirectorate && (missingInstall || missingOm) && (
          <SectionCard
            title="Gjenero licencë të re"
            subtitle={
              missingOm && !missingInstall
                ? "Shtoni licencën OM që mungon"
                : missingInstall && !missingOm
                  ? "Shtoni licencën e instalimit që mungon"
                  : "Shtoni licencat që mungojnë"
            }
            padded
          >
            <CompanyIssueLicenseSection organizationId={id} licenses={licenses} />
          </SectionCard>
        )}
      </DirectoratePageShell>
    </AppShell>
  );
}

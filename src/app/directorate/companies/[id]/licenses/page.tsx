import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { CreateLicenseForm } from "@/components/forms/create-license-form";
import { LicenseRevokeButton, LicenseStatusBadge } from "@/components/directorate/license-actions";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { PortalEmptyState } from "@/components/shared/portal-table";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";
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

  return (
    <AppShell title={`Licencat - ${company.name}`}>
      <div className="space-y-6">
        <DirectoratePageHeader
          title={`Licencat · ${company.name}`}
          description="Licencat dhe autorizimet e regjistruara për këtë kompani"
          actions={
            <Button variant="outline" asChild>
              <Link href={`/directorate/companies/${id}`}>← Kthehu te kompania</Link>
            </Button>
          }
        />

        {isDirectorate && <CreateLicenseForm organizationId={id} />}

        <SectionCard title="Licencat ekzistuese" padded>
          {licenses.length === 0 ? (
            <PortalEmptyState>Nuk ka licenca të regjistruara.</PortalEmptyState>
          ) : (
            <ul className="space-y-3 text-sm">
              {licenses.map((license) => (
                <li key={license.id} className="rounded border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{license.licenseNumber}</p>
                    <LicenseStatusBadge status={license.status} />
                  </div>
                  <p>Lloji: {license.licenseType}</p>
                  <p>
                    {license.issuedDate.toLocaleDateString("sq-AL")} –{" "}
                    {license.expiryDate.toLocaleDateString("sq-AL")}
                  </p>
                  {license.scope && <p>Shtrirja: {license.scope}</p>}
                  {isDirectorate && (
                    <LicenseRevokeButton
                      licenseId={license.id}
                      licenseNumber={license.licenseNumber}
                      status={license.status}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}

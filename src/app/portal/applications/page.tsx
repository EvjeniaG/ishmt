import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatus, ApplicationType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ApplicationFilters } from "@/components/owner/application-filters";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth";
import { getMunicipalities } from "@/lib/data/municipalities";
import { labelApplicationType } from "@/lib/constants/display-labels";
import { ApplicationService } from "@/lib/services/application-service";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { portalEyebrowForRole } from "@/lib/constants/portal-labels";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { ROLE_CODES } from "@/lib/constants/roles";
import { LegalDeadlineBadge } from "@/components/deadlines/deadline-badge";
import { DeadlineService } from "@/lib/deadlines/deadline-service";
import { displayCertifierOrganizationName } from "@/lib/elevators/format-om-body";

function applicationLink(id: string) {
  return `/portal/applications/${id}`;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    status?: string;
    municipalityId?: string;
    returned?: string;
    rejected?: string;
    approved?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_VIEW_OWN)) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const ctx = {
    userId: session.user.id,
    email: session.user.email ?? "",
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    activeOrgId: session.user.activeOrgId,
    activeOrgType: session.user.activeOrgType,
    activeOrgName: session.user.activeOrgName,
    roleCode: session.user.roleCode,
    permissions: session.user.permissions,
  };

  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const dateTo = params.dateTo ? new Date(`${params.dateTo}T23:59:59`) : undefined;

  const [applications, municipalities, returnedApps] = await Promise.all([
    ApplicationService.listForContext(ctx, {
      type: params.type as ApplicationType | undefined,
      status: params.status as ApplicationStatus | undefined,
      municipalityId: params.municipalityId,
      returnedOnly: params.returned === "1",
      rejectedOnly: params.rejected === "1",
      approvedOnly: params.approved === "1",
      dateFrom,
      dateTo,
    }),
    session.user.roleCode === ROLE_CODES.OWNER ? getMunicipalities() : Promise.resolve([]),
    session.user.roleCode === ROLE_CODES.OWNER
      ? OwnerPortalService.listReturnedApplications(session.user.activeOrgId)
      : Promise.resolve([]),
  ]);

  const canCreate = session.user.roleCode === ROLE_CODES.OWNER;
  const pageTitle =
    session.user.roleCode === ROLE_CODES.INSTALLER
      ? "Aplikime të Deleguara"
      : session.user.roleCode === ROLE_CODES.CERTIFIER
        ? "Aplikime për Certifikim"
        : "Aplikimet e Mia";

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow={portalEyebrowForRole(session.user.roleCode)}
        title={pageTitle}
        description="Menaxhoni të gjitha aplikimet e organizatës suaj"
        actions={
          canCreate ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-gov-primary hover:bg-gov-secondary">
                <Link href="/portal/applications/new/registration">Regjistro ashensor</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/portal/applications/new">Aplikim për ndryshim</Link>
              </Button>
            </div>
          ) : undefined
        }
      >
        {canCreate && <ApplicationFilters municipalities={municipalities} />}

        {canCreate && returnedApps.length > 0 && !params.returned && (
          <SectionCard
            title={`Aplikime të kthyera për korrigjim (${returnedApps.length})`}
            className="border-l-4 border-l-gov-warning"
            padded
          >
            <div className="space-y-3">
              {returnedApps.slice(0, 5).map((app) => (
                <div key={app.id} className="portal-list-item flex-col items-start gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      href={applicationLink(app.id)}
                      className="font-medium text-gov-primary hover:underline"
                    >
                      {app.applicationNumber}
                    </Link>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Arsyeja:</span> {app.returnReason ?? "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Kthyer nga{" "}
                      {app.returnedBy ? `${app.returnedBy.firstName} ${app.returnedBy.lastName}` : "-"}
                      {" · "}
                      {app.returnedAt ? new Date(app.returnedAt).toLocaleDateString("sq-AL") : "-"}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={applicationLink(app.id)}>Korrigjo</Link>
                  </Button>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard
          title="Lista e aplikimeve"
          meta={
            <span className="portal-badge-neutral tabular-nums">{applications.length} regjistrime</span>
          }
        >
          {applications.length === 0 ? (
            <PortalEmptyState>Nuk ka aplikime që përputhen me filtrat.</PortalEmptyState>
          ) : (
            <PortalTableWrap>
              <thead>
                <tr>
                  <th>Nr. aplikimit</th>
                  <th>Lloji</th>
                  <th>Statusi</th>
                  <th>Ashensori / adresa</th>
                  <th>Instaluesi</th>
                  <th>Certifikuesi / OMI</th>
                  <th>Krijuar</th>
                  <th>Dorëzuar</th>
                  <th>Afati ISHMT</th>
                  <th>Përditësuar</th>
                  <th>Hapi tjetër</th>
                  <th>Veprime</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td>{app.applicationNumber}</td>
                    <td>{labelApplicationType(app.type, app.data?.updateType)}</td>
                    <td>
                      <ApplicationStatusBadge
                        status={app.status}
                        type={app.type}
                        roleCode={session.user.roleCode}
                      />
                    </td>
                    <td>{app.targetElevator?.registryNumber ?? app.data?.buildingAddress ?? "-"}</td>
                    <td>{app.installerOrg?.name ?? "-"}</td>
                    <td>
                      {displayCertifierOrganizationName(
                        app.certifierOrg?.name,
                        app.data?.omiNumber,
                      ) ?? "-"}
                    </td>
                    <td>{new Date(app.createdAt).toLocaleDateString("sq-AL")}</td>
                    <td>{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("sq-AL") : "-"}</td>
                    <td>
                      {app.submittedAt &&
                      DeadlineService.isApplicationUnderProcedureReview(app.status) ? (
                        <LegalDeadlineBadge submittedAt={app.submittedAt} compact />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{new Date(app.updatedAt).toLocaleDateString("sq-AL")}</td>
                    <td>{ApplicationService.getNextRequiredAction(app, session.user.roleCode)}</td>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex gap-3">
                        <Link
                          href={applicationLink(app.id)}
                          className="text-gov-primary hover:underline"
                        >
                          Shiko
                        </Link>
                        {canCreate && app.status === ApplicationStatus.DRAFT && (
                          <Link
                            href={applicationLink(app.id)}
                            className="text-gov-primary hover:underline"
                          >
                            Vazhdo
                          </Link>
                        )}
                        {canCreate && app.status === ApplicationStatus.RETURNED && (
                          <Link
                            href={applicationLink(app.id)}
                            className="text-gov-primary hover:underline"
                          >
                            Korrigjo
                          </Link>
                        )}
                        {canCreate && app.status === ApplicationStatus.PENDING_OWNER_SUBMISSION && (
                          <Link
                            href={applicationLink(app.id)}
                            className="text-gov-primary hover:underline"
                          >
                            Parashtro
                          </Link>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PortalTableWrap>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

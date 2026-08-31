import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatus, ApplicationType, ReturnTargetRole } from "@prisma/client";
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
import { portalEyebrowForCapabilities, portalEyebrowForRole } from "@/lib/constants/portal-labels";
import { isReturnedToRole } from "@/lib/workflows/return-targets";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";
import { hasServiceCapability } from "@/lib/organizations/org-capabilities";
import { LegalDeadlineBadge } from "@/components/deadlines/deadline-badge";
import { DeadlineService } from "@/lib/deadlines/deadline-service";
import { displayCertifierOrganizationName } from "@/lib/elevators/format-om-body";
import {
  displayCertifierColumn,
  displayInstallerColumn,
  isDelegationRevokedForOrg,
} from "@/lib/delegation/delegation-revoked";

function applicationLink(id: string) {
  return `/portal/applications/${id}`;
}

function stakeholderCanCorrectReturn(
  roleCode: string,
  app: { returnToRole?: ReturnTargetRole | null; returnToRoles?: unknown },
): boolean {
  if (roleCode === ROLE_CODES.OWNER) return isReturnedToRole(app, ReturnTargetRole.OWNER);
  if (roleCode === ROLE_CODES.CERTIFIER) return isReturnedToRole(app, ReturnTargetRole.CERTIFIER);
  if (roleCode === ROLE_CODES.INSTALLER) return isReturnedToRole(app, ReturnTargetRole.INSTALLER);
  return false;
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

  if (!session.user.permissions.includes(PERMISSIONS.APPLICATIONS_VIEW_OWN)) {
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
    orgCapabilities: session.user.orgCapabilities ?? null,
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
    ApplicationService.listReturnedForContext(ctx),
  ]);

  const caps = session.user.orgCapabilities;
  const canCreate = session.user.roleCode === ROLE_CODES.OWNER;
  const pageTitle =
    hasServiceCapability(session.user, "install") && hasServiceCapability(session.user, "om")
      ? "Aplikime instalimi & certifikimi"
      : hasServiceCapability(session.user, "install")
        ? "Aplikime të Deleguara"
        : hasServiceCapability(session.user, "om")
          ? "Aplikime për Certifikim"
          : "Aplikimet e Mia";

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow={portalEyebrowForCapabilities(caps, session.user.roleCode)}
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

        {returnedApps.filter((app) => stakeholderCanCorrectReturn(session.user.roleCode, app)).length > 0 &&
          !params.returned && (
          <SectionCard
            title={`Korrigjim i kërkuar (${
              returnedApps.filter((app) => stakeholderCanCorrectReturn(session.user.roleCode, app)).length
            })`}
            className="border-l-4 border-l-gov-warning"
            padded
          >
            <div className="space-y-4">
              {returnedApps
                .filter((app) => stakeholderCanCorrectReturn(session.user.roleCode, app))
                .slice(0, 5)
                .map((app) => (
                <div key={app.id} className="rounded-xl border border-amber-200/70 bg-amber-50/50 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Link
                        href={applicationLink(app.id)}
                        className="font-semibold text-gov-primary hover:underline"
                      >
                        {app.applicationNumber}
                      </Link>
                      {app.returnReason ? <p className="text-sm text-foreground">{app.returnReason}</p> : null}
                      {app.requiredCorrection ? (
                        <p className="text-sm text-foreground">
                          <span className="font-medium">Çfarë duhet bërë:</span> {app.requiredCorrection}
                        </p>
                      ) : null}
                      <p className="text-sm font-medium text-emerald-800">
                        Riparashtroni aplikimin kur të jeni gati.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Kthyer nga{" "}
                        {app.returnedBy ? `${app.returnedBy.firstName} ${app.returnedBy.lastName}` : "-"}
                        {" · "}
                        {app.returnedAt ? new Date(app.returnedAt).toLocaleDateString("sq-AL") : "-"}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="shrink-0">
                      <Link href={applicationLink(app.id)}>Korrigjo</Link>
                    </Button>
                  </div>
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
                  <th>Certifikuesi / OM</th>
                  <th>Krijuar</th>
                  <th>Dorëzuar</th>
                  <th>Afati IQMT</th>
                  <th>Përditësuar</th>
                  <th>Hapi tjetër</th>
                  <th>Veprime</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => {
                  const listCtx = {
                    roleCode: session.user.roleCode,
                    activeOrgId: ctx.activeOrgId,
                    activeOrgName: ctx.activeOrgName,
                  };
                  const delegationRevoked = isDelegationRevokedForOrg(
                    app.delegations,
                    session.user.roleCode,
                    ctx.activeOrgId,
                    app,
                  );
                  return (
                  <tr key={app.id}>
                    <td>{app.applicationNumber}</td>
                    <td>{labelApplicationType(app.type, app.data?.updateType)}</td>
                    <td>
                      <ApplicationStatusBadge
                        status={app.status}
                        type={app.type}
                        roleCode={session.user.roleCode}
                        delegationRevoked={delegationRevoked}
                      />
                    </td>
                    <td>{app.targetElevator?.registryNumber ?? app.data?.buildingAddress ?? "-"}</td>
                    <td>{displayInstallerColumn(app, listCtx)}</td>
                    <td>
                      {displayCertifierColumn(app, listCtx, displayCertifierOrganizationName)}
                    </td>
                    <td>{new Date(app.createdAt).toLocaleDateString("sq-AL")}</td>
                    <td>{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("sq-AL") : "-"}</td>
                    <td>
                      {!delegationRevoked &&
                      app.submittedAt &&
                      DeadlineService.isApplicationUnderProcedureReview(app.status) ? (
                        <LegalDeadlineBadge submittedAt={app.submittedAt} compact />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {delegationRevoked
                        ? "-"
                        : new Date(app.updatedAt).toLocaleDateString("sq-AL")}
                    </td>
                    <td>
                      {ApplicationService.getNextRequiredAction(
                        app,
                        session.user.roleCode,
                        ctx.activeOrgId,
                      )}
                    </td>
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
                  );
                })}
              </tbody>
            </PortalTableWrap>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

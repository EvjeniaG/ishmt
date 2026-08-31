import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { LegalDeadlineBadge } from "@/components/deadlines/deadline-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { OfficialTableFooter, RegistryNumber, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import { canChiefHandleApplications } from "@/lib/permissions/ishmt-roles";
import { ApplicationService } from "@/lib/services/application-service";
import { currentPhaseLabel } from "@/lib/services/application-participation";

function actionLabel(status: ApplicationStatus) {
  if (status === ApplicationStatus.SUBMITTED) return "Delego";
  if (status === ApplicationStatus.PENDING_CHIEF_INSPECTOR) return "Vendos";
  return "Shqyrto dosjen";
}

export default async function ChiefApplicationsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!canChiefHandleApplications(session.user.roleCode)) redirect("/unauthorized");

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

  const applications = await ApplicationService.listRegistrationPipeline(ctx);
  const pendingDecision = applications.filter(
    (app) => app.status === ApplicationStatus.PENDING_CHIEF_INSPECTOR,
  ).length;
  const pendingDelegation = applications.filter(
    (app) => app.status === ApplicationStatus.SUBMITTED,
  ).length;

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="IQMT · Kryeinspektor"
        title="Aplikime për regjistrim"
        description="Dosjet e regjistrimit nga parashtrimi deri te vendimi final - delegim, mbikëqyrje dhe miratim."
      >
        <SectionCard
          title="Radha e aplikimeve"
          subtitle="Të gjitha dosjet aktive deri te regjistrimi"
          meta={
            <span className="portal-badge-neutral tabular-nums">
              {applications.length} në proces
              {pendingDecision > 0 ? ` · ${pendingDecision} për vendim` : ""}
              {pendingDelegation > 0 ? ` · ${pendingDelegation} për delegim` : ""}
            </span>
          }
        >
          {applications.length === 0 ? (
            <PortalEmptyState>Nuk ka aplikime për regjistrim në proces.</PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Nr. aplikimit</th>
                    <th>Lloji</th>
                    <th>Personi përgjegjës</th>
                    <th>Hallka aktuale</th>
                    <th>Statusi</th>
                    <th>Afati</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, index) => (
                    <tr key={app.id}>
                      <td className="tabular-nums text-muted-foreground">{index + 1}</td>
                      <td>
                        <RegistryNumber>{app.applicationNumber}</RegistryNumber>
                      </td>
                      <td>{APPLICATION_TYPE_LABELS[app.type] ?? app.type}</td>
                      <td>{app.ownerOrg.name}</td>
                      <td>
                        <p className="text-sm">{currentPhaseLabel(app.status)}</p>
                        {app.currentAssignee ? (
                          <p className="text-xs text-muted-foreground">
                            {app.currentAssignee.firstName} {app.currentAssignee.lastName}
                          </p>
                        ) : null}
                      </td>
                      <td>
                        <ApplicationStatusBadge
                          status={app.status}
                          type={app.type}
                          roleCode={session.user.roleCode}
                        />
                      </td>
                      <td>
                        {app.submittedAt ? (
                          <LegalDeadlineBadge submittedAt={app.submittedAt} compact />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <Link href={`/ishmt/review/${app.id}`} className="portal-table-link">
                          {actionLabel(app.status)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PortalTableWrap>
              <OfficialTableFooter total={applications.length} />
            </>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

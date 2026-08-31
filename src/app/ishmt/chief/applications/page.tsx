import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatus, ApplicationType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { LegalDeadlineBadge } from "@/components/deadlines/deadline-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { OfficialTableFooter, RegistryNumber, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { labelApplicationType } from "@/lib/constants/display-labels";
import { canChiefHandleApplications } from "@/lib/permissions/ishmt-roles";
import { ApplicationService } from "@/lib/services/application-service";
import {
  currentPhaseLabel,
  isTerminalApplicationStatus,
} from "@/lib/services/application-participation";
import { usesDirectChiefReview } from "@/lib/workflows/ishmt-direct-chief-review";

function actionLabel(status: ApplicationStatus, type: ApplicationType) {
  if (isTerminalApplicationStatus(status)) return "Shiko dosjen";
  if (status === ApplicationStatus.SUBMITTED) {
    return usesDirectChiefReview(type) ? "Vendos" : "Delego";
  }
  if (status === ApplicationStatus.PENDING_CHIEF_INSPECTOR) return "Vendos";
  return "Shqyrto dosjen";
}

export default async function ChiefApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showHistory = tab === "history";

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

  const applications = await ApplicationService.listIshmtApplicationRegistry(ctx, {
    activeOnly: !showHistory,
  });
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
        title="Aplikime"
        description="Regjistri i aplikimeve të parashtruara te IQMT - në proces dhe historiku."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["active", "Në proces"],
              ["history", "Historiku"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={key === "active" ? "/ishmt/chief/applications" : "/ishmt/chief/applications?tab=history"}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                (key === "history") === showHistory
                  ? "border-primary bg-primary/5 font-medium"
                  : "hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <SectionCard
          title={showHistory ? "Historiku i aplikimeve" : "Radha e aplikimeve"}
          subtitle={
            showHistory
              ? "Të gjitha llojet e aplikimeve të mbyllura ose të vendosura"
              : "Dosjet aktive që kërkojnë veprim ose janë në shqyrtim"
          }
          meta={
            <span className="portal-badge-neutral tabular-nums">
              {applications.length} {showHistory ? "në historik" : "në proces"}
              {!showHistory && pendingDecision > 0 ? ` · ${pendingDecision} për vendim` : ""}
              {!showHistory && pendingDelegation > 0 ? ` · ${pendingDelegation} për delegim` : ""}
            </span>
          }
        >
          {applications.length === 0 ? (
            <PortalEmptyState>
              {showHistory ? "Nuk ka aplikime në historik." : "Nuk ka aplikime në proces."}
            </PortalEmptyState>
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
                      <td>{labelApplicationType(app.type, app.data?.updateType)}</td>
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
                        {!showHistory && app.submittedAt ? (
                          <LegalDeadlineBadge submittedAt={app.submittedAt} compact />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <Link href={`/ishmt/review/${app.id}`} className="portal-table-link">
                          {actionLabel(app.status, app.type)}
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

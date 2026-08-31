import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { LegalDeadlineBadge } from "@/components/deadlines/deadline-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { MetricCard } from "@/components/shared/metric-card";
import { OfficialTableFooter, RegistryNumber, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import { ApplicationService } from "@/lib/services/application-service";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { canApproveApplications, canReviewApplications } from "@/lib/permissions/ishmt-roles";
import type { ReviewQueueBucket } from "@/lib/services/application-participation";
import { currentPhaseLabel } from "@/lib/services/application-participation";

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const queueBucket: ReviewQueueBucket =
    tab === "waiting" ? "waiting" : tab === "completed" ? "completed" : "needs_action";

  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_VIEW_ALL)) {
    redirect("/unauthorized");
  }

  const role = session.user.roleCode;
  const isApprover = canApproveApplications(role);
  const isReviewer = canReviewApplications(role);

  const applications = await ApplicationService.listForContext({
    userId: session.user.id,
    email: session.user.email ?? "",
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    activeOrgId: session.user.activeOrgId,
    activeOrgType: session.user.activeOrgType,
    activeOrgName: session.user.activeOrgName,
    roleCode: session.user.roleCode,
    permissions: session.user.permissions,
  }, { queueBucket });

  const urgentCount = applications.filter(
    (app) =>
      app.submittedAt &&
      ["SUBMITTED", "PENDING_DIRECTOR", "PENDING_SECTOR_HEAD", "PENDING_FIELD_REVIEW", "PENDING_DIRECTOR_REPORT", "PENDING_CHIEF_INSPECTOR"].includes(app.status),
  ).length;

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="IQMT · Shqyrtim administrativ"
        title="Aplikime në shqyrtim"
        description={
          isApprover
            ? "Dosjet e Aplikimeve për Registrim - vendimi final nga kryeinspektori."
            : isReviewer
              ? "Delegim, caktim inspektorësh, raporte dhe ndjekje e dosjes."
              : "Pamje e përgjithshme e aplikimeve në proces."
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["needs_action", "Kërkon veprimin tim"],
              ["waiting", "Në shqyrtim nga hallka tjetër"],
              ["completed", "Të përfunduara"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={`/ishmt/review?tab=${key}`}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                queueBucket === key ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="portal-kpi-grid sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Në radhë" value={applications.length} accent="primary" subtitle="Aplikime aktive" />
          <MetricCard
            label="Nën afat procedural"
            value={urgentCount}
            accent="warning"
            subtitle="Monitorim i afatit 10-ditor"
          />
          <MetricCard
            label="Niveli i aksesit"
            value={isApprover ? "Miratim" : isReviewer ? "Shqyrtim" : "Lexim"}
            accent="primary"
            subtitle="Sipas rolit të caktuar"
          />
        </div>

        <SectionCard
          title="Regjistri i aplikimeve"
          subtitle="Lista zyrtare e dosjeve në pritje të shqyrtimit"
          meta={
            <span className="portal-badge-neutral tabular-nums">{applications.length} regjistrime</span>
          }
        >
          {applications.length === 0 ? (
            <PortalEmptyState>Nuk ka aplikime në radhë për shqyrtim.</PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Nr. aplikimit</th>
                    <th>Lloji</th>
                    <th>Vendndodhja / Personi përgjegjës i ashensorit</th>
                    <th>Hallka aktuale</th>
                    <th>Progresi</th>
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
                      <td>
                        <p>{app.data?.municipality?.nameSq ?? app.targetElevator?.registryNumber ?? "-"}</p>
                        <p className="text-xs font-normal text-muted-foreground">{app.ownerOrg.name}</p>
                      </td>
                      <td>
                        <p className="text-sm">{currentPhaseLabel(app.status)}</p>
                        {app.currentAssignee ? (
                          <p className="text-xs text-muted-foreground">
                            {app.currentAssignee.firstName} {app.currentAssignee.lastName}
                          </p>
                        ) : null}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {app.fieldReviewAssignments.length > 0
                          ? (() => {
                              const p = ApplicationService.getFieldReviewProgressSummary(
                                app.fieldReviewAssignments,
                              );
                              return `${p.completed} nga ${p.total} raporte`;
                            })()
                          : "-"}
                      </td>
                      <td>
                        <ApplicationStatusBadge
                          status={app.status}
                          type={app.type}
                          roleCode={role}
                        />
                      </td>
                      <td>
                        {app.submittedAt &&
                        ["SUBMITTED", "UNDER_REVIEW", "PENDING_CHIEF_INSPECTOR"].includes(app.status) ? (
                          <LegalDeadlineBadge submittedAt={app.submittedAt} compact />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td>
                        <Link href={`/ishmt/review/${app.id}`} className="portal-table-link">
                          Shqyrto dosjen
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

import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { OfficialTableFooter, RegistryNumber, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { labelApplicationType } from "@/lib/constants/display-labels";
import { canDirectApplications } from "@/lib/permissions/ishmt-roles";
import { ApplicationService } from "@/lib/services/application-service";
import { currentPhaseLabel } from "@/lib/services/application-participation";

export default async function DirectorReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showHistory = tab === "history";

  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!canDirectApplications(session.user.roleCode)) redirect("/unauthorized");

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

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="IQMT · Drejtor i Drejtorisë"
        title="Shqyrtimi i aplikimeve"
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
              href={key === "active" ? "/ishmt/director/review" : "/ishmt/director/review?tab=history"}
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
          title={showHistory ? "Historiku i aplikimeve" : "Radha e shqyrtimit"}
          subtitle={
            showHistory
              ? "Të gjitha llojet e aplikimeve të mbyllura ose të vendosura"
              : "Dosjet aktive në proces"
          }
        >
          {applications.length === 0 ? (
            <PortalEmptyState>
              {showHistory ? "Nuk ka aplikime në historik." : "Nuk ka aplikime në radhë."}
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
                      <td className="text-sm">{currentPhaseLabel(app.status)}</td>
                      <td>
                        <ApplicationStatusBadge
                          status={app.status}
                          type={app.type}
                          roleCode={session.user.roleCode}
                        />
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

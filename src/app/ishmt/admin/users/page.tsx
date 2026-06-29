import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { UserAdminSearchForm, UserAdminTable } from "@/components/ishmt/user-admin-table";
import { OfficialTableFooter, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { UserAdminService } from "@/lib/services/user-admin-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function UserManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user || session.user.roleCode !== ROLE_CODES.ADMIN) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const result = await UserAdminService.listUsers({
    query: params.q,
    page,
    activeOnly: false,
  });

  return (
    <AppShell title="Menaxhimi i përdoruesve">
      <StandardPageLayout
        eyebrow="ISHMT · Administrim"
        title="Menaxhimi i përdoruesve"
        description="Aktivizim, bllokim dhe rivendosje fjalëkalimi"
      >
        <SectionCard
          title="Regjistri i përdoruesve"
          meta={<span className="portal-badge-neutral tabular-nums">{result.total} përdorues</span>}
        >
          <div className="border-b border-border/60 px-5 py-4 sm:px-6">
            <UserAdminSearchForm defaultQuery={params.q} />
          </div>
          <div className="p-5 sm:p-6">
            <UserAdminTable users={result.items} />
            <OfficialTableFooter total={result.total} label="përdorues" />
          </div>
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

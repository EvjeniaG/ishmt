import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { InviteMemberForm } from "@/components/forms/invite-member-form";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { OrganizationService } from "@/lib/services/organization-service";
import { portalEyebrowForRole } from "@/lib/constants/portal-labels";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";

export default async function MembersPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.USERS_MEMBERS_MANAGE)) {
    redirect("/unauthorized");
  }

  const org = await OrganizationService.getById(session.user.activeOrgId);
  if (!org) redirect("/portal/dashboard");

  return (
    <AppShell title="Anëtarët">
      <StandardPageLayout
        eyebrow={portalEyebrowForRole(session.user.roleCode)}
        title="Anëtarët"
        description="Menaxhoni anëtarët e organizatës suaj"
      >
        <InviteMemberForm roleCode={session.user.roleCode} />
        <SectionCard title="Anëtarët aktualë" padded>
          <ul className="space-y-2 text-sm">
            {org.memberships.map((m) => (
              <li key={m.id}>
                {m.user.firstName} {m.user.lastName} - {m.user.email}
              </li>
            ))}
          </ul>
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}

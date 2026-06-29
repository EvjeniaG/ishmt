import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { AccountSecurityPanel } from "@/components/account/account-security-panel";
import { OwnerProfileForm } from "@/components/owner/owner-profile-form";
import { EditOwnOrgForm } from "@/components/forms/edit-own-org-form";
import { getAuthSession } from "@/lib/auth";
import { getMunicipalities } from "@/lib/data/municipalities";
import { OWNER_TERM } from "@/lib/constants/owner-labels";
import { portalEyebrowForRole } from "@/lib/constants/portal-labels";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { OrganizationService } from "@/lib/services/organization-service";
import { ROLE_CODES } from "@/lib/constants/roles";
import { PORTAL_COMPANY_ROLES } from "@/lib/permissions/nav-paths";
import { db } from "@/lib/db";

const COMPANY_ROLES = PORTAL_COMPANY_ROLES.filter((role) => role !== ROLE_CODES.OWNER);

async function getAccountSecurity(userId: string) {
  const user = await db.authUser.findUnique({
    where: { id: userId },
    select: {
      email: true,
      emailVerified: true,
      pendingEmail: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
      phone: true,
      nid: true,
      lastLoginAt: true,
    },
  });

  if (!user) return null;

  return {
    email: user.email,
    emailVerified: user.emailVerified,
    pendingEmail: user.pendingEmail,
    twoFactorEnabled: user.twoFactorEnabled,
    hasPendingTwoFactorSetup: Boolean(user.twoFactorSecret && !user.twoFactorEnabled),
    phone: user.phone,
    nid: user.nid,
    lastLoginAt: user.lastLoginAt,
  };
}

export default async function ProfilePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

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

  const security = await getAccountSecurity(session.user.id);
  if (!security) redirect("/auth/login");

  const securityPanel = (
    <AccountSecurityPanel
      security={{
        email: security.email,
        emailVerified: security.emailVerified,
        pendingEmail: security.pendingEmail,
        twoFactorEnabled: security.twoFactorEnabled,
        hasPendingTwoFactorSetup: security.hasPendingTwoFactorSetup,
      }}
    />
  );

  if (session.user.roleCode === ROLE_CODES.OWNER) {
    const [profile, municipalities] = await Promise.all([
      OwnerPortalService.getProfileData(ctx),
      getMunicipalities(),
    ]);

    return (
      <AppShell title={`Profili - ${OWNER_TERM}`}>
        <div className="mx-auto max-w-4xl">
          <StandardPageLayout
            eyebrow="Portali · Personi përgjegjës i ashensorit"
            title="Profili"
            description="Të dhënat e llogarisë dhe organizatës suaj"
          >
            <OwnerProfileForm data={profile} municipalities={municipalities} />
            {securityPanel}
          </StandardPageLayout>
        </div>
      </AppShell>
    );
  }

  const isCompanyRole = COMPANY_ROLES.includes(session.user.roleCode as (typeof COMPANY_ROLES)[number]);
  const [org, municipalities] = isCompanyRole
    ? await Promise.all([
        OrganizationService.getById(session.user.activeOrgId),
        getMunicipalities(),
      ])
    : [null, []];

  return (
    <AppShell title="Profili">
      <div className="mx-auto max-w-3xl">
        <StandardPageLayout
          eyebrow={portalEyebrowForRole(session.user.roleCode)}
          title="Profili"
          description='Shtypni "Ndrysho" për të modifikuar të dhënat personale, pastaj "Ruaj ndryshimet".'
        >
          <AccountProfileForm
            firstName={session.user.firstName}
            lastName={session.user.lastName}
            email={security.email}
            roleCode={session.user.roleCode}
            orgName={session.user.activeOrgName}
            phone={security.phone}
            nid={security.nid}
            lastLoginAt={security.lastLoginAt}
            hideOrgFields={session.user.roleCode === ROLE_CODES.CERTIFIER}
          />
          {isCompanyRole && org && session.user.roleCode !== ROLE_CODES.CERTIFIER && (
            <EditOwnOrgForm org={org} municipalities={municipalities} />
          )}
          {securityPanel}
        </StandardPageLayout>
      </div>
    </AppShell>
  );
}

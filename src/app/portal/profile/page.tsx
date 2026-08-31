import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { AccountSecurityPanel } from "@/components/account/account-security-panel";
import { StaffProfileForm } from "@/components/account/staff-profile-form";
import { CompanyProfileForm } from "@/components/company/company-profile-form";
import { OwnerProfileForm } from "@/components/owner/owner-profile-form";
import { ServiceProviderDocumentGuide } from "@/components/service-provider/service-provider-document-guide";
import { getAuthSession } from "@/lib/auth";
import { OWNER_TERM } from "@/lib/constants/owner-labels";
import { portalEyebrowForRole } from "@/lib/constants/portal-labels";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { OrganizationService } from "@/lib/services/organization-service";
import { ROLE_CODES } from "@/lib/constants/roles";
import { PORTAL_COMPANY_ROLES, ISHMT_STAFF_ROLES } from "@/lib/permissions/nav-paths";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { isLicensedServiceProvider } from "@/lib/organizations/org-capabilities";
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
    const profile = await OwnerPortalService.getProfileData(ctx);

    return (
      <AppShell title={`Profili - ${OWNER_TERM}`}>
        <div className="mx-auto max-w-4xl">
          <StandardPageLayout
            eyebrow="Portali · Personi përgjegjës i ashensorit"
            title="Profili"
            description="Të dhënat e subjektit dhe personit përgjegjës - si në regjistrim"
          >
            <OwnerProfileForm data={profile} />
            {securityPanel}
          </StandardPageLayout>
        </div>
      </AppShell>
    );
  }

  if (COMPANY_ROLES.includes(session.user.roleCode as (typeof COMPANY_ROLES)[number])) {
    const [user, org] = await Promise.all([
      db.authUser.findUnique({
        where: { id: session.user.id },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          nid: true,
        },
      }),
      OrganizationService.getById(session.user.activeOrgId),
    ]);

    if (!user || !org) redirect("/auth/login");

    const canEditOrg = roleHasPermission(session.user.roleCode, PERMISSIONS.ORG_EDIT_OWN);
    const orgCaps = session.user.orgCapabilities;
    const showDocumentGuide = orgCaps && isLicensedServiceProvider({ type: org.type, ...orgCaps });

    return (
      <AppShell title="Profili">
        <div className="mx-auto max-w-4xl">
          <StandardPageLayout
            eyebrow={portalEyebrowForRole(session.user.roleCode)}
            title="Profili"
            description="Të dhënat e kompanisë dhe dokumentacioni i kërkuar sipas funksionit"
          >
            <CompanyProfileForm
              data={{
                user,
                org: { name: org.name, nipt: org.nipt },
                canEditOrg,
              }}
            />
            {showDocumentGuide && orgCaps ? <ServiceProviderDocumentGuide caps={orgCaps} /> : null}
            {securityPanel}
          </StandardPageLayout>
        </div>
      </AppShell>
    );
  }

  const staffUser = await db.authUser.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      fatherName: true,
      email: true,
      phone: true,
      nid: true,
    },
  });

  if (!staffUser) redirect("/auth/login");

  const isStaff =
    ISHMT_STAFF_ROLES.includes(session.user.roleCode) ||
    session.user.roleCode === ROLE_CODES.DIRECTORATE;

  return (
    <AppShell title="Profili">
      <div className="mx-auto max-w-4xl">
        <StandardPageLayout
          eyebrow={portalEyebrowForRole(session.user.roleCode)}
          title="Profili"
          description={
            isStaff
              ? "Të dhënat personale të llogarisë suaj"
              : 'Shtypni "Ndrysho" për të modifikuar të dhënat personale, pastaj "Ruaj ndryshimet".'
          }
        >
          <StaffProfileForm data={staffUser} />
          {securityPanel}
        </StandardPageLayout>
      </div>
    </AppShell>
  );
}

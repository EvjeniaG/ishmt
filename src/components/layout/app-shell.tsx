import { getAuthSession } from "@/lib/auth";
import { PortalShell } from "@/components/layout/portal-shell";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import {
  getDashboardPathForRole,
  getNotificationsPathForRole,
  getProfilePathForRole,
  getSearchPathForRole,
  ISHMT_STAFF_ROLES,
} from "@/lib/permissions/nav-paths";
import { getRoleLabel } from "@/lib/constants/role-labels";
import { OWNER_TERM } from "@/lib/constants/owner-labels";

type ShellConfig = {
  roleLabel: string;
  homeHref: string;
  showSearch: boolean;
  searchHref?: string;
  notificationsHref?: string;
  profileHref?: string;
};

function withSearchConfig(roleCode: RoleCode, config: Omit<ShellConfig, "showSearch" | "searchHref">): ShellConfig {
  const searchHref = getSearchPathForRole(roleCode) ?? undefined;
  return {
    ...config,
    showSearch: Boolean(searchHref),
    searchHref,
  };
}

const SHELL_BY_ROLE: Record<string, ShellConfig> = {
  [ROLE_CODES.OWNER]: withSearchConfig(ROLE_CODES.OWNER, {
    roleLabel: OWNER_TERM,
    homeHref: getDashboardPathForRole(ROLE_CODES.OWNER),
    notificationsHref: getNotificationsPathForRole(ROLE_CODES.OWNER),
    profileHref: getProfilePathForRole(ROLE_CODES.OWNER),
  }),
  [ROLE_CODES.INSTALLER]: withSearchConfig(ROLE_CODES.INSTALLER, {
    roleLabel: "KOMPANI INSTALUESE",
    homeHref: getDashboardPathForRole(ROLE_CODES.INSTALLER),
    notificationsHref: getNotificationsPathForRole(ROLE_CODES.INSTALLER),
    profileHref: getProfilePathForRole(ROLE_CODES.INSTALLER),
  }),
  [ROLE_CODES.CERTIFIER]: withSearchConfig(ROLE_CODES.CERTIFIER, {
    roleLabel: "OM / CERTIFIKUES",
    homeHref: getDashboardPathForRole(ROLE_CODES.CERTIFIER),
    notificationsHref: getNotificationsPathForRole(ROLE_CODES.CERTIFIER),
    profileHref: getProfilePathForRole(ROLE_CODES.CERTIFIER),
  }),
  [ROLE_CODES.MAINTENANCE]: {
    roleLabel: "KOMPANI MIRËMBAJTËSE",
    homeHref: getDashboardPathForRole(ROLE_CODES.MAINTENANCE),
    showSearch: false,
    notificationsHref: getNotificationsPathForRole(ROLE_CODES.MAINTENANCE),
    profileHref: getProfilePathForRole(ROLE_CODES.MAINTENANCE),
  },
  [ROLE_CODES.INSPECTOR]: withSearchConfig(ROLE_CODES.INSPECTOR, {
    roleLabel: "INSPEKTOR IQMT",
    homeHref: getDashboardPathForRole(ROLE_CODES.INSPECTOR),
    notificationsHref: getNotificationsPathForRole(ROLE_CODES.INSPECTOR),
    profileHref: getProfilePathForRole(ROLE_CODES.INSPECTOR),
  }),
  [ROLE_CODES.CHIEF_INSPECTOR]: withSearchConfig(ROLE_CODES.CHIEF_INSPECTOR, {
    roleLabel: "KRYEINSPEKTOR",
    homeHref: getDashboardPathForRole(ROLE_CODES.CHIEF_INSPECTOR),
    notificationsHref: getNotificationsPathForRole(ROLE_CODES.CHIEF_INSPECTOR),
    profileHref: getProfilePathForRole(ROLE_CODES.CHIEF_INSPECTOR),
  }),
  [ROLE_CODES.ISHMT_DIRECTOR]: withSearchConfig(ROLE_CODES.ISHMT_DIRECTOR, {
    roleLabel: "DREJTOR I DREJTORISË",
    homeHref: getDashboardPathForRole(ROLE_CODES.ISHMT_DIRECTOR),
    notificationsHref: getNotificationsPathForRole(ROLE_CODES.ISHMT_DIRECTOR),
    profileHref: getProfilePathForRole(ROLE_CODES.ISHMT_DIRECTOR),
  }),
  [ROLE_CODES.ADMIN]: withSearchConfig(ROLE_CODES.ADMIN, {
    roleLabel: "ADMINISTRATOR IQMT",
    homeHref: getDashboardPathForRole(ROLE_CODES.ADMIN),
    notificationsHref: getNotificationsPathForRole(ROLE_CODES.ADMIN),
    profileHref: getProfilePathForRole(ROLE_CODES.ADMIN),
  }),
  [ROLE_CODES.DIRECTORATE]: withSearchConfig(ROLE_CODES.DIRECTORATE, {
    roleLabel: "DREJTORIA E POLITIKAVE",
    homeHref: getDashboardPathForRole(ROLE_CODES.DIRECTORATE),
    notificationsHref: getNotificationsPathForRole(ROLE_CODES.DIRECTORATE),
    profileHref: getProfilePathForRole(ROLE_CODES.DIRECTORATE),
  }),
};

function getShellConfig(roleCode: string): ShellConfig {
  const preset = SHELL_BY_ROLE[roleCode];
  if (preset) return preset;

  if (ISHMT_STAFF_ROLES.includes(roleCode as RoleCode)) {
    return withSearchConfig(roleCode as RoleCode, {
      roleLabel: getRoleLabel(roleCode).toUpperCase(),
      homeHref: getDashboardPathForRole(roleCode as RoleCode),
      notificationsHref: getNotificationsPathForRole(roleCode as RoleCode),
      profileHref: getProfilePathForRole(roleCode as RoleCode),
    });
  }

  return SHELL_BY_ROLE[ROLE_CODES.OWNER];
}

export async function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const session = await getAuthSession();
  const roleCode = session?.user?.roleCode ?? ROLE_CODES.OWNER;
  const config = getShellConfig(roleCode);

  return (
    <PortalShell
      title={title}
      role={roleCode}
      roleLabel={getRoleLabel(roleCode) || config.roleLabel}
      homeHref={config.homeHref}
      showSearch={config.showSearch}
      searchHref={config.searchHref}
      notificationsHref={config.notificationsHref}
      profileHref={config.profileHref}
    >
      {children}
    </PortalShell>
  );
}

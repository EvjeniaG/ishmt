import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import {
  ALL_AUTHENTICATED_ROLES,
  getDashboardPathForRole,
  ISHMT_STAFF_ROLES,
  ISHMT_APPROVER_ROLES,
  PORTAL_COMPANY_ROLES,
} from "@/lib/permissions/nav-paths";

export const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/register/maintenance",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/accept-invitation",
  "/auth/expired",
  "/unauthorized",
  "/report",
  "/report/success",
  "/api/health",
];

export const PUBLIC_PREFIXES = ["/q/", "/report/", "/api/auth/"];

export function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

type RouteRule = {
  prefix: string;
  roles: RoleCode[];
};

/**
 * More specific prefixes first.
 * Shared routes (profile, notifications) must appear before panel-wide rules.
 */
export const ROUTE_RULES: RouteRule[] = [
  { prefix: "/portal/raportet", roles: ALL_AUTHENTICATED_ROLES.filter((r) => r !== ROLE_CODES.PUBLIC) },
  { prefix: "/portal/profile", roles: ALL_AUTHENTICATED_ROLES },
  { prefix: "/portal/notifications", roles: ALL_AUTHENTICATED_ROLES },
  { prefix: "/portal/settings", roles: PORTAL_COMPANY_ROLES },
  { prefix: "/portal/elevators", roles: [...PORTAL_COMPANY_ROLES, ...ISHMT_STAFF_ROLES] },
  { prefix: "/ishmt/chief", roles: [...ISHMT_APPROVER_ROLES] },
  { prefix: "/ishmt/field-inspections", roles: [...ISHMT_STAFF_ROLES] },
  { prefix: "/ishmt/my-field-inspections", roles: [ROLE_CODES.FIELD_INSPECTOR] },
  { prefix: "/ishmt/admin/qkb-validation", roles: [ROLE_CODES.ADMIN] },
  { prefix: "/ishmt/admin", roles: [ROLE_CODES.ADMIN] },
  {
    prefix: "/ishmt/review",
    roles: [...ISHMT_STAFF_ROLES],
  },
  { prefix: "/ishmt", roles: [...ISHMT_STAFF_ROLES] },
  { prefix: "/directorate", roles: [ROLE_CODES.DIRECTORATE, ROLE_CODES.ADMIN] },
  { prefix: "/portal", roles: PORTAL_COMPANY_ROLES },
];

export function getAllowedRolesForPath(pathname: string): RoleCode[] | null {
  for (const rule of ROUTE_RULES) {
    if (pathname.startsWith(rule.prefix)) {
      return rule.roles;
    }
  }
  return null;
}

export function getDefaultRedirectForRole(roleCode: RoleCode): string {
  return getDashboardPathForRole(roleCode);
}

export function isIshmtStaffRole(roleCode: RoleCode): boolean {
  return ISHMT_STAFF_ROLES.includes(roleCode);
}

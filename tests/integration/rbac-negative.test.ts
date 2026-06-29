import { describe, expect, it } from "vitest";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { PERMISSIONS, type PermissionCode } from "@/lib/permissions/codes";
import { getPermissionsForRole, roleHasPermission } from "@/lib/permissions/matrix";

/**
 * Negative RBAC coverage: for the most sensitive permissions we assert that
 * EXACTLY the intended role(s) hold them and no one else. This catches the
 * classic privilege-creep regression where a permission is accidentally added
 * to the wrong role's array.
 */

const ALL_ROLES: RoleCode[] = Object.values(ROLE_CODES);

function rolesWith(permission: PermissionCode): RoleCode[] {
  return ALL_ROLES.filter((role) => roleHasPermission(role, permission)).sort();
}

describe("Sensitive permissions are held by exactly the right roles", () => {
  const cases: Array<[string, PermissionCode, RoleCode[]]> = [
    ["final approval", PERMISSIONS.APPLICATIONS_APPROVE, [ROLE_CODES.CHIEF_INSPECTOR]],
    ["manage installer companies", PERMISSIONS.ORG_MANAGE_INSTALLER, [ROLE_CODES.DIRECTORATE]],
    ["manage certifier companies", PERMISSIONS.ORG_MANAGE_CERTIFIER, [ROLE_CODES.DIRECTORATE]],
    ["manage licenses", PERMISSIONS.LICENSES_MANAGE, [ROLE_CODES.DIRECTORATE]],
    ["manual QKB validation", PERMISSIONS.QKB_VALIDATE_MANUAL, [ROLE_CODES.ADMIN]],
    ["manage all users", PERMISSIONS.USERS_MANAGE_ALL, [ROLE_CODES.ADMIN]],
    ["view system-wide audit", PERMISSIONS.AUDIT_VIEW_SYSTEM, [ROLE_CODES.ADMIN]],
  ];

  for (const [label, permission, expectedRoles] of cases) {
    it(`${label} is restricted to ${expectedRoles.join(", ")}`, () => {
      expect(rolesWith(permission)).toEqual([...expectedRoles].sort());
    });
  }
});

describe("Business roles can never see the full application registry", () => {
  const businessRoles: RoleCode[] = [
    ROLE_CODES.OWNER,
    ROLE_CODES.INSTALLER,
    ROLE_CODES.CERTIFIER,
    ROLE_CODES.MAINTENANCE,
  ];

  for (const role of businessRoles) {
    it(`${role} cannot view all applications`, () => {
      expect(roleHasPermission(role, PERMISSIONS.APPLICATIONS_VIEW_ALL)).toBe(false);
    });
  }
});

describe("Inspector vs chief inspector separation of duties", () => {
  it("inspector can review but not approve", () => {
    expect(roleHasPermission(ROLE_CODES.INSPECTOR, PERMISSIONS.APPLICATIONS_REVIEW)).toBe(false);
    expect(roleHasPermission(ROLE_CODES.INSPECTOR, PERMISSIONS.APPLICATIONS_APPROVE)).toBe(false);
  });

  it("chief inspector can both review and approve", () => {
    expect(roleHasPermission(ROLE_CODES.CHIEF_INSPECTOR, PERMISSIONS.APPLICATIONS_REVIEW)).toBe(
      true,
    );
    expect(roleHasPermission(ROLE_CODES.CHIEF_INSPECTOR, PERMISSIONS.APPLICATIONS_APPROVE)).toBe(
      true,
    );
  });
});

describe("PUBLIC role is strictly limited", () => {
  it("PUBLIC has only public-facing permissions", () => {
    const perms = getPermissionsForRole(ROLE_CODES.PUBLIC);
    expect(perms).toEqual([PERMISSIONS.PUBLIC_QR_VIEW, PERMISSIONS.PUBLIC_REPORT_CREATE]);
  });

  it("PUBLIC cannot view dashboards or applications", () => {
    expect(roleHasPermission(ROLE_CODES.PUBLIC, PERMISSIONS.DASHBOARD_VIEW)).toBe(false);
    expect(roleHasPermission(ROLE_CODES.PUBLIC, PERMISSIONS.APPLICATIONS_VIEW_OWN)).toBe(false);
  });
});

describe("Directorate is scoped to oversight, not application processing", () => {
  it("Directorate cannot create, review or approve applications", () => {
    expect(roleHasPermission(ROLE_CODES.DIRECTORATE, PERMISSIONS.APPLICATIONS_CREATE)).toBe(false);
    expect(roleHasPermission(ROLE_CODES.DIRECTORATE, PERMISSIONS.APPLICATIONS_REVIEW)).toBe(false);
    expect(roleHasPermission(ROLE_CODES.DIRECTORATE, PERMISSIONS.APPLICATIONS_APPROVE)).toBe(false);
  });
});

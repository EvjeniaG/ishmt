import { describe, expect, it } from "vitest";
import { ROLE_CODES } from "@/lib/constants/roles";
import { isRoleValidForOrgType } from "@/lib/constants/org-role-map";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { getPermissionsForRole, roleHasPermission } from "@/lib/permissions/matrix";
import { getAllowedRolesForPath } from "@/lib/permissions/routes";
import { OrgType } from "@prisma/client";

describe("RBAC permission matrix", () => {
  it("OWNER can view dashboard but not manage installer companies", () => {
    expect(roleHasPermission(ROLE_CODES.OWNER, PERMISSIONS.DASHBOARD_VIEW)).toBe(true);
    expect(roleHasPermission(ROLE_CODES.OWNER, PERMISSIONS.ORG_MANAGE_INSTALLER)).toBe(false);
  });

  it("DIRECTORATE can manage installer and certifier companies", () => {
    expect(roleHasPermission(ROLE_CODES.DIRECTORATE, PERMISSIONS.ORG_MANAGE_INSTALLER)).toBe(true);
    expect(roleHasPermission(ROLE_CODES.DIRECTORATE, PERMISSIONS.ORG_MANAGE_CERTIFIER)).toBe(true);
    expect(roleHasPermission(ROLE_CODES.DIRECTORATE, PERMISSIONS.LICENSES_MANAGE)).toBe(true);
  });

  it("ADMIN has QKB validate but not directorate write permissions", () => {
    expect(roleHasPermission(ROLE_CODES.ADMIN, PERMISSIONS.QKB_VALIDATE_MANUAL)).toBe(true);
    expect(roleHasPermission(ROLE_CODES.ADMIN, PERMISSIONS.ORG_MANAGE_INSTALLER)).toBe(false);
    expect(roleHasPermission(ROLE_CODES.ADMIN, PERMISSIONS.ORG_VIEW_COMPANIES)).toBe(true);
  });

  it("MAINTENANCE can submit QKB but not validate", () => {
    expect(roleHasPermission(ROLE_CODES.MAINTENANCE, PERMISSIONS.QKB_SUBMIT)).toBe(true);
    expect(roleHasPermission(ROLE_CODES.MAINTENANCE, PERMISSIONS.QKB_VALIDATE_MANUAL)).toBe(false);
  });

  it("INSTALLER cannot self-register via permissions (no manage org)", () => {
    const perms = getPermissionsForRole(ROLE_CODES.INSTALLER);
    expect(perms).not.toContain(PERMISSIONS.ORG_MANAGE_INSTALLER);
    expect(perms).not.toContain(PERMISSIONS.ORG_MANAGE_CERTIFIER);
  });

  it("INSPECTOR cannot access directorate routes", () => {
    const allowed = getAllowedRolesForPath("/directorate/companies");
    expect(allowed).toContain(ROLE_CODES.DIRECTORATE);
    expect(allowed).toContain(ROLE_CODES.ADMIN);
    expect(allowed).not.toContain(ROLE_CODES.INSPECTOR);
  });
});

describe("Organization type role constraints", () => {
  it("INSTALLER role only valid in INSTALLER org", () => {
    expect(isRoleValidForOrgType(ROLE_CODES.INSTALLER, OrgType.INSTALLER)).toBe(true);
    expect(isRoleValidForOrgType(ROLE_CODES.INSTALLER, OrgType.OWNER)).toBe(false);
  });

  it("DIRECTORATE role only valid in DIRECTORATE org", () => {
    expect(isRoleValidForOrgType(ROLE_CODES.DIRECTORATE, OrgType.DIRECTORATE)).toBe(true);
    expect(isRoleValidForOrgType(ROLE_CODES.DIRECTORATE, OrgType.INSTALLER)).toBe(false);
  });
});

describe("Route protection rules", () => {
  it("QKB admin queue is ADMIN only", () => {
    const allowed = getAllowedRolesForPath("/ishmt/admin/qkb-validation");
    expect(allowed).toEqual([ROLE_CODES.ADMIN]);
  });

  it("portal routes allow business roles", () => {
    const allowed = getAllowedRolesForPath("/portal/dashboard");
    expect(allowed).toContain(ROLE_CODES.OWNER);
    expect(allowed).toContain(ROLE_CODES.MAINTENANCE);
    expect(allowed).not.toContain(ROLE_CODES.DIRECTORATE);
  });
});

describe("Application permissions (Phase 3)", () => {
  it("OWNER can create and submit applications", () => {
    expect(roleHasPermission(ROLE_CODES.OWNER, PERMISSIONS.APPLICATIONS_CREATE)).toBe(true);
    expect(roleHasPermission(ROLE_CODES.OWNER, PERMISSIONS.APPLICATIONS_SUBMIT)).toBe(true);
    expect(roleHasPermission(ROLE_CODES.OWNER, PERMISSIONS.APPLICATIONS_APPROVE)).toBe(false);
  });

  it("INSTALLER can fill technical data", () => {
    expect(roleHasPermission(ROLE_CODES.INSTALLER, PERMISSIONS.APPLICATIONS_FILL_TECHNICAL)).toBe(true);
    expect(roleHasPermission(ROLE_CODES.INSTALLER, PERMISSIONS.APPLICATIONS_UPLOAD_CERTIFICATION)).toBe(false);
  });

  it("INSPECTOR can review but not final approve", () => {
    expect(roleHasPermission(ROLE_CODES.INSPECTOR, PERMISSIONS.APPLICATIONS_REVIEW)).toBe(false);
    expect(roleHasPermission(ROLE_CODES.INSPECTOR, PERMISSIONS.APPLICATIONS_APPROVE)).toBe(false);
    expect(roleHasPermission(ROLE_CODES.INSPECTOR, PERMISSIONS.APPLICATIONS_CREATE)).toBe(false);
  });

  it("CHIEF_INSPECTOR can view all and final approve", () => {
    expect(roleHasPermission(ROLE_CODES.CHIEF_INSPECTOR, PERMISSIONS.APPLICATIONS_VIEW_ALL)).toBe(true);
    expect(roleHasPermission(ROLE_CODES.CHIEF_INSPECTOR, PERMISSIONS.APPLICATIONS_APPROVE)).toBe(true);
  });

  it("ADMIN can view all but not final approve", () => {
    expect(roleHasPermission(ROLE_CODES.ADMIN, PERMISSIONS.APPLICATIONS_VIEW_ALL)).toBe(true);
    expect(roleHasPermission(ROLE_CODES.ADMIN, PERMISSIONS.APPLICATIONS_APPROVE)).toBe(false);
  });
});

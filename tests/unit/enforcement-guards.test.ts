import { describe, expect, it } from "vitest";
import { OrgType } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { getPermissionsForRole } from "@/lib/permissions/matrix";
import type { AuthContext } from "@/lib/permissions/guards";
import { OrganizationService } from "@/lib/services/organization-service";
import { LicenseService } from "@/lib/services/license-service";

/**
 * The enforcement actions (suspend / revoke / reinstate a company, revoke a
 * license) are high-impact: they can take a licensed installer or certifier
 * out of business. These tests pin down the authorization guards so that only
 * the Directorate, with the right permissions, can run them.
 */

function makeCtx(roleCode: RoleCode, overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: "user-1",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
    activeOrgId: "org-1",
    activeOrgType: "DIRECTORATE",
    activeOrgName: "Test Org",
    roleCode,
    permissions: getPermissionsForRole(roleCode),
    ...overrides,
  };
}

const NON_DIRECTORATE_ROLES: RoleCode[] = Object.values(ROLE_CODES).filter(
  (r) => r !== ROLE_CODES.DIRECTORATE,
);

describe("OrganizationService.assertCanManageLicensedCompany", () => {
  it("allows the Directorate to manage installer companies", () => {
    expect(() =>
      OrganizationService.assertCanManageLicensedCompany(
        makeCtx(ROLE_CODES.DIRECTORATE),
        OrgType.INSTALLER,
      ),
    ).not.toThrow();
  });

  it("allows the Directorate to manage certifier companies", () => {
    expect(() =>
      OrganizationService.assertCanManageLicensedCompany(
        makeCtx(ROLE_CODES.DIRECTORATE),
        OrgType.CERTIFIER,
      ),
    ).not.toThrow();
  });

  it("rejects every non-Directorate role for both company types", () => {
    for (const role of NON_DIRECTORATE_ROLES) {
      for (const type of [OrgType.INSTALLER, OrgType.CERTIFIER] as const) {
        expect(() =>
          OrganizationService.assertCanManageLicensedCompany(makeCtx(role), type),
        ).toThrow(/Vetëm Drejtoria/);
      }
    }
  });

  it("rejects a Directorate user that is missing the install-manage permission", () => {
    const ctx = makeCtx(ROLE_CODES.DIRECTORATE, { permissions: [] });
    expect(() =>
      OrganizationService.assertCanManageLicensedCompany(ctx, OrgType.INSTALLER),
    ).toThrow();
  });
});

describe("LicenseService.assertCanManage", () => {
  it("allows the Directorate with LICENSES_MANAGE", () => {
    expect(() => LicenseService.assertCanManage(makeCtx(ROLE_CODES.DIRECTORATE))).not.toThrow();
  });

  it("rejects every non-Directorate role", () => {
    for (const role of NON_DIRECTORATE_ROLES) {
      expect(() => LicenseService.assertCanManage(makeCtx(role))).toThrow(/Vetëm Drejtoria/);
    }
  });

  it("rejects a Directorate user without the manage permission", () => {
    const ctx = makeCtx(ROLE_CODES.DIRECTORATE, { permissions: [] });
    expect(() => LicenseService.assertCanManage(ctx)).toThrow();
  });
});

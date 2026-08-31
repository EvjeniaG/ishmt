import { DelegationStatus, DelegationType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { ApplicationService } from "@/lib/services/application-service";
import { ROLE_CODES } from "@/lib/constants/roles";
import { PERMISSIONS } from "@/lib/permissions/codes";

const installerCtx = {
  userId: "user-1",
  email: "installer@test.al",
  activeOrgId: "org-installer",
  activeOrgType: "INSTALLER" as const,
  activeOrgName: "Instalues",
  roleCode: ROLE_CODES.INSTALLER,
  permissions: [PERMISSIONS.APPLICATIONS_VIEW_OWN],
};

describe("ApplicationService.canAccess after delegation revoke", () => {
  it("allows installer to view application when delegation was revoked", () => {
    expect(
      ApplicationService.canAccess(installerCtx, {
        ownerOrgId: "org-owner",
        installerOrgId: null,
        certifierOrgId: null,
        assignedInspectorId: null,
        delegations: [
          {
            organizationId: "org-installer",
            accessType: DelegationType.INSTALLER,
            status: DelegationStatus.REVOKED,
          },
        ],
      }),
    ).toBe(true);
  });

  it("denies installer without any delegation link", () => {
    expect(
      ApplicationService.canAccess(installerCtx, {
        ownerOrgId: "org-owner",
        installerOrgId: null,
        certifierOrgId: null,
        assignedInspectorId: null,
        delegations: [],
      }),
    ).toBe(false);
  });
});

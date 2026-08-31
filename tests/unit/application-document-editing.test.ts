import { ApplicationStatus, ApplicationType, ReturnTargetRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canRoleEditApplicationDocuments } from "@/lib/documents/application-document-editing";
import { ROLE_CODES } from "@/lib/constants/roles";

const baseApp = {
  type: ApplicationType.NEW_REGISTRATION,
  status: ApplicationStatus.TECHNICAL_DATA_COMPLETED,
  returnToRole: null,
  returnToRoles: null,
};

describe("canRoleEditApplicationDocuments", () => {
  it("blocks installer after technical step is complete", () => {
    expect(
      canRoleEditApplicationDocuments(ROLE_CODES.INSTALLER, baseApp, "installer-complete"),
    ).toBe(false);
  });

  it("allows installer during active technical step", () => {
    expect(
      canRoleEditApplicationDocuments(ROLE_CODES.INSTALLER, baseApp, "technical-data"),
    ).toBe(true);
  });

  it("allows installer when returned for correction", () => {
    expect(
      canRoleEditApplicationDocuments(
        ROLE_CODES.INSTALLER,
        {
          ...baseApp,
          status: ApplicationStatus.RETURNED,
          returnToRole: ReturnTargetRole.INSTALLER,
        },
        "technical-data",
      ),
    ).toBe(true);
  });

  it("allows owner on basic data and blocks while waiting for installer", () => {
    expect(canRoleEditApplicationDocuments(ROLE_CODES.OWNER, baseApp, "basic-data")).toBe(true);
    expect(canRoleEditApplicationDocuments(ROLE_CODES.OWNER, baseApp, "wait-installer")).toBe(false);
  });
});

import { ApplicationStatus, ApplicationType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  COMPLETED_APPLICATION_STATUS_LABEL,
  NO_FURTHER_ACTION_LABEL,
  getApplicationStatusLabel,
} from "@/lib/registration/status-presentation";
import { ApplicationService } from "@/lib/services/application-service";
import { ROLE_CODES } from "@/lib/constants/roles";

describe("getApplicationStatusLabel", () => {
  it("uses the same completed label for approved registration and lifecycle apps", () => {
    expect(
      getApplicationStatusLabel(ApplicationStatus.APPROVED, ApplicationType.NEW_REGISTRATION),
    ).toBe(COMPLETED_APPLICATION_STATUS_LABEL);
    expect(
      getApplicationStatusLabel(ApplicationStatus.APPROVED, ApplicationType.DATA_UPDATE),
    ).toBe(COMPLETED_APPLICATION_STATUS_LABEL);
    expect(getApplicationStatusLabel(ApplicationStatus.CLOSED)).toBe(
      COMPLETED_APPLICATION_STATUS_LABEL,
    );
  });

  it("keeps in-progress labels unchanged", () => {
    expect(getApplicationStatusLabel(ApplicationStatus.DRAFT)).toBe("Në pregatitje");
    expect(getApplicationStatusLabel(ApplicationStatus.REJECTED)).toBe("E refuzuar");
  });
});

describe("ApplicationService.getNextRequiredAction completed labels", () => {
  it("does not repeat completed status in the next-step column", () => {
    expect(
      ApplicationService.getNextRequiredAction(
        {
          id: "app-1",
          type: ApplicationType.DATA_UPDATE,
          status: ApplicationStatus.APPROVED,
        },
        ROLE_CODES.OWNER,
        "org-owner",
      ),
    ).toBe(NO_FURTHER_ACTION_LABEL);
  });
});

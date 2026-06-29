import { describe, expect, it } from "vitest";
import { ApplicationStatus, ApplicationType, ReturnTargetRole } from "@prisma/client";
import { ROLE_CODES } from "@/lib/constants/roles";
import {
  assertTransition,
  findTransition,
  WorkflowError,
} from "@/lib/workflows/application-workflow";

describe("NEW_REGISTRATION workflow", () => {
  it("owner can save basic data from DRAFT", () => {
    expect(
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.DRAFT,
        "SAVE_BASIC_DATA",
        ROLE_CODES.OWNER,
      ),
    ).toBe(ApplicationStatus.BASIC_DATA_COMPLETED);
  });

  it("owner can assign installer from BASIC_DATA_COMPLETED", () => {
    const rule = findTransition(
      ApplicationType.NEW_REGISTRATION,
      ApplicationStatus.BASIC_DATA_COMPLETED,
      "ASSIGN_INSTALLER",
      ROLE_CODES.OWNER,
    );
    expect(rule?.to).toBe(ApplicationStatus.INSTALLER_INVITED);
  });

  it("installer completion moves to TECHNICAL_DATA_COMPLETED", () => {
    expect(
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.INSTALLER_ACCEPTED,
        "COMPLETE_INSTALLER",
        ROLE_CODES.INSTALLER,
      ),
    ).toBe(ApplicationStatus.TECHNICAL_DATA_COMPLETED);
  });

  it("chief inspector approves from PENDING_CHIEF_INSPECTOR", () => {
    expect(
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.PENDING_CHIEF_INSPECTOR,
        "APPROVE",
        ROLE_CODES.CHIEF_INSPECTOR,
      ),
    ).toBe(ApplicationStatus.APPROVED);
  });

  it("inspector forwards to chief from UNDER_REVIEW", () => {
    expect(
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.UNDER_REVIEW,
        "FORWARD_TO_CHIEF",
        ROLE_CODES.INSPECTOR,
      ),
    ).toBe(ApplicationStatus.PENDING_CHIEF_INSPECTOR);
  });

  it("return to installer sets RETURNED", () => {
    expect(
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.UNDER_REVIEW,
        "RETURN",
        ROLE_CODES.INSPECTOR,
        { returnTarget: ReturnTargetRole.INSTALLER },
      ),
    ).toBe(ApplicationStatus.RETURNED);
  });
});

describe("Other application types", () => {
  it("DEREGISTRATION owner can submit from DRAFT", () => {
    expect(
      assertTransition(
        ApplicationType.DEREGISTRATION,
        ApplicationStatus.DRAFT,
        "SUBMIT",
        ROLE_CODES.OWNER,
      ),
    ).toBe(ApplicationStatus.SUBMITTED);
  });

  it("DEREGISTRATION approve is blocked as not implemented", () => {
    expect(() =>
      assertTransition(
        ApplicationType.DEREGISTRATION,
        ApplicationStatus.UNDER_REVIEW,
        "APPROVE",
        ROLE_CODES.INSPECTOR,
      ),
    ).toThrow(WorkflowError);
  });

  it("MODERNIZATION assign installer is recognized", () => {
    const rule = findTransition(
      ApplicationType.MODERNIZATION,
      ApplicationStatus.DRAFT,
      "ASSIGN_INSTALLER",
      ROLE_CODES.OWNER,
    );
    expect(rule?.to).toBe(ApplicationStatus.PENDING_INSTALLER);
  });

  it("unsupported transition is blocked safely", () => {
    expect(() =>
      assertTransition(
        ApplicationType.DATA_CORRECTION,
        ApplicationStatus.DRAFT,
        "APPROVE",
        ROLE_CODES.INSPECTOR,
      ),
    ).toThrow(WorkflowError);
  });
});

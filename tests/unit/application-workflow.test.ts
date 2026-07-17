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

  it("chief delegates to director from SUBMITTED", () => {
    expect(
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.SUBMITTED,
        "DELEGATE_TO_DIRECTOR",
        ROLE_CODES.CHIEF_INSPECTOR,
      ),
    ).toBe(ApplicationStatus.PENDING_DIRECTOR);
  });

  it("director forwards to chief from PENDING_DIRECTOR_REPORT", () => {
    expect(
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.PENDING_DIRECTOR_REPORT,
        "FORWARD_TO_CHIEF",
        ROLE_CODES.ISHMT_DIRECTOR,
      ),
    ).toBe(ApplicationStatus.PENDING_CHIEF_INSPECTOR);
  });

  it("sector head forwards report from PENDING_SECTOR_HEAD_REPORT", () => {
    expect(
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.PENDING_SECTOR_HEAD_REPORT,
        "FORWARD_TO_DIRECTOR",
        ROLE_CODES.SECTOR_HEAD,
      ),
    ).toBe(ApplicationStatus.PENDING_DIRECTOR_REPORT);
  });

  it("chief can return to inspectors from final review", () => {
    expect(
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.PENDING_CHIEF_INSPECTOR,
        "RETURN_TO_INSPECTORS",
        ROLE_CODES.CHIEF_INSPECTOR,
      ),
    ).toBe(ApplicationStatus.RETURNED_TO_INSPECTORS);
  });

  it("director cannot approve", () => {
    expect(() =>
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.PENDING_CHIEF_INSPECTOR,
        "APPROVE",
        ROLE_CODES.ISHMT_DIRECTOR,
      ),
    ).toThrow(WorkflowError);
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

  it("MODERNIZATION owner can submit from PENDING_OWNER_SUBMISSION", () => {
    expect(
      assertTransition(
        ApplicationType.MODERNIZATION,
        ApplicationStatus.PENDING_OWNER_SUBMISSION,
        "SUBMIT",
        ROLE_CODES.OWNER,
      ),
    ).toBe(ApplicationStatus.SUBMITTED);
  });
});

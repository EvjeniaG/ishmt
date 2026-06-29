import { describe, expect, it } from "vitest";
import { ApplicationStatus, ApplicationType, ReturnTargetRole } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import {
  APPLICATION_TRANSITIONS,
  assertTransition,
  findTransition,
  getTransitionsForType,
  isActionSupported,
  resolveReturnResumeStatus,
  resolveReturnStatus,
  WorkflowError,
  type TransitionRule,
  type WorkflowAction,
} from "@/lib/workflows/application-workflow";

/**
 * These tests lock the legally meaningful parts of the application workflow.
 * They are deliberately exhaustive over the whole transition table so that an
 * accidental edit (e.g. letting an inspector self-approve, or creating an
 * ambiguous transition) fails CI instead of silently changing legal outcomes.
 */

const SUPPORTED_TYPES: ApplicationType[] = [
  ApplicationType.NEW_REGISTRATION,
  ApplicationType.DEREGISTRATION,
  ApplicationType.DATA_CORRECTION,
  ApplicationType.DATA_UPDATE,
  ApplicationType.MODERNIZATION,
];

const ALL_ROLES: RoleCode[] = Object.values(ROLE_CODES);

function transitionKey(rule: TransitionRule): string {
  return [rule.applicationType, rule.from, rule.action, rule.returnTarget ?? "-"].join("|");
}

describe("Workflow table integrity", () => {
  it("every supported application type has at least one transition", () => {
    for (const type of SUPPORTED_TYPES) {
      expect(getTransitionsForType(type).length).toBeGreaterThan(0);
    }
  });

  it("no rule grants an empty role set", () => {
    for (const rule of APPLICATION_TRANSITIONS) {
      expect(rule.roles.length).toBeGreaterThan(0);
    }
  });

  it("is deterministic: a given (type, from, action, role, returnTarget) resolves to a single destination", () => {
    const destinations = new Map<string, Set<ApplicationStatus>>();

    for (const rule of APPLICATION_TRANSITIONS) {
      for (const role of rule.roles) {
        const key = [transitionKey(rule), role].join("|");
        const set = destinations.get(key) ?? new Set<ApplicationStatus>();
        set.add(rule.to);
        destinations.set(key, set);
      }
    }

    const ambiguous = [...destinations.entries()].filter(([, set]) => set.size > 1);
    expect(ambiguous).toEqual([]);
  });

  it("never lets a transition keep the same status (no self-loops)", () => {
    const selfLoops = APPLICATION_TRANSITIONS.filter((rule) => rule.from === rule.to);
    expect(selfLoops).toEqual([]);
  });
});

describe("Approval authority is exclusive to the chief inspector", () => {
  it("only CHIEF_INSPECTOR can reach APPROVED, and only via APPROVE", () => {
    const approvals = APPLICATION_TRANSITIONS.filter((r) => r.to === ApplicationStatus.APPROVED);
    expect(approvals.length).toBeGreaterThan(0);

    for (const rule of approvals) {
      expect(rule.action).toBe("APPROVE");
      expect(rule.roles).toEqual([ROLE_CODES.CHIEF_INSPECTOR]);
      expect(rule.from).toBe(ApplicationStatus.PENDING_CHIEF_INSPECTOR);
    }
  });

  it("only CHIEF_INSPECTOR can reach REJECTED", () => {
    const rejections = APPLICATION_TRANSITIONS.filter((r) => r.to === ApplicationStatus.REJECTED);
    expect(rejections.length).toBeGreaterThan(0);

    for (const rule of rejections) {
      expect(rule.roles).toEqual([ROLE_CODES.CHIEF_INSPECTOR]);
    }
  });

  it("no non-chief role can ever APPROVE for any supported type or status", () => {
    const nonChiefRoles = ALL_ROLES.filter((r) => r !== ROLE_CODES.CHIEF_INSPECTOR);

    for (const type of SUPPORTED_TYPES) {
      for (const status of Object.values(ApplicationStatus)) {
        for (const role of nonChiefRoles) {
          const rule = findTransition(type, status, "APPROVE", role);
          expect(rule).toBeUndefined();
        }
      }
    }
  });

  it("inspectors can only forward or recommend rejection, never approve", () => {
    expect(
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.UNDER_REVIEW,
        "FORWARD_TO_CHIEF",
        ROLE_CODES.INSPECTOR,
      ),
    ).toBe(ApplicationStatus.PENDING_CHIEF_INSPECTOR);

    expect(() =>
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.PENDING_CHIEF_INSPECTOR,
        "APPROVE",
        ROLE_CODES.INSPECTOR,
      ),
    ).toThrow(WorkflowError);
  });
});

describe("Owner authority boundaries", () => {
  it("owners cannot pick up review, forward, approve or reject", () => {
    const forbidden: WorkflowAction[] = ["PICKUP_REVIEW", "FORWARD_TO_CHIEF", "APPROVE", "REJECT"];
    for (const type of SUPPORTED_TYPES) {
      for (const status of Object.values(ApplicationStatus)) {
        for (const action of forbidden) {
          expect(findTransition(type, status, action, ROLE_CODES.OWNER)).toBeUndefined();
        }
      }
    }
  });

  it("owner can only cancel from DRAFT or BASIC_DATA_COMPLETED in NEW_REGISTRATION", () => {
    const cancellable = APPLICATION_TRANSITIONS.filter(
      (r) =>
        r.applicationType === ApplicationType.NEW_REGISTRATION &&
        r.action === "CANCEL" &&
        r.roles.includes(ROLE_CODES.OWNER),
    ).map((r) => r.from);

    expect(cancellable.sort()).toEqual(
      [ApplicationStatus.DRAFT, ApplicationStatus.BASIC_DATA_COMPLETED].sort(),
    );
  });
});

describe("Post-approval asset pipeline is inspector-only", () => {
  const pipeline: Array<[ApplicationStatus, WorkflowAction, ApplicationStatus]> = [
    [ApplicationStatus.APPROVED, "ELEVATOR_CREATED", ApplicationStatus.ELEVATOR_CREATED],
    [ApplicationStatus.ELEVATOR_CREATED, "ASSETS_GENERATED", ApplicationStatus.ASSETS_GENERATED],
    [ApplicationStatus.ASSETS_GENERATED, "CLOSE", ApplicationStatus.CLOSED],
  ];

  it("inspector advances the pipeline step by step", () => {
    for (const [from, action, to] of pipeline) {
      expect(
        assertTransition(ApplicationType.NEW_REGISTRATION, from, action, ROLE_CODES.INSPECTOR),
      ).toBe(to);
    }
  });

  it("non-inspector roles cannot drive the post-approval pipeline", () => {
    const others = ALL_ROLES.filter((r) => r !== ROLE_CODES.INSPECTOR);
    for (const [from, action] of pipeline) {
      for (const role of others) {
        expect(
          findTransition(ApplicationType.NEW_REGISTRATION, from, action, role),
        ).toBeUndefined();
      }
    }
  });
});

describe("RETURN handling", () => {
  it("requires an explicit return target when the rule is target-specific", () => {
    // Without a target, the ambiguous inspector RETURN must not resolve.
    expect(
      findTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.UNDER_REVIEW,
        "RETURN",
        ROLE_CODES.INSPECTOR,
      ),
    ).toBeUndefined();
  });

  it("resolves the correct destination per target", () => {
    for (const target of [
      ReturnTargetRole.OWNER,
      ReturnTargetRole.INSTALLER,
      ReturnTargetRole.CERTIFIER,
    ]) {
      const rule = findTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.UNDER_REVIEW,
        "RETURN",
        ROLE_CODES.INSPECTOR,
        { returnTarget: target },
      );
      expect(rule?.to).toBe(ApplicationStatus.RETURNED);
    }
  });

  it("maps return targets to the right resume status", () => {
    expect(resolveReturnResumeStatus(ReturnTargetRole.OWNER)).toBe(
      ApplicationStatus.BASIC_DATA_COMPLETED,
    );
    expect(resolveReturnResumeStatus(ReturnTargetRole.INSTALLER)).toBe(
      ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS,
    );
    expect(resolveReturnResumeStatus(ReturnTargetRole.CERTIFIER)).toBe(
      ApplicationStatus.CERTIFICATION_IN_PROGRESS,
    );
  });

  it("RETURN always lands on RETURNED regardless of target", () => {
    for (const target of Object.values(ReturnTargetRole)) {
      expect(resolveReturnStatus(target)).toBe(ApplicationStatus.RETURNED);
    }
  });
});

describe("Unsupported transitions fail safely", () => {
  it("throws UNSUPPORTED_TYPE for a type with no transition table", () => {
    try {
      assertTransition(
        "UNKNOWN_TYPE" as ApplicationType,
        ApplicationStatus.DRAFT,
        "SUBMIT",
        ROLE_CODES.OWNER,
      );
      throw new Error("expected assertTransition to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(WorkflowError);
      expect((err as WorkflowError).code).toBe("UNSUPPORTED_TYPE");
    }
  });

  it("throws UNSUPPORTED_TRANSITION for a wrong role on a real transition", () => {
    expect(() =>
      assertTransition(
        ApplicationType.NEW_REGISTRATION,
        ApplicationStatus.DRAFT,
        "SAVE_BASIC_DATA",
        ROLE_CODES.INSTALLER,
      ),
    ).toThrowError(/nuk lejohet/);
  });

  it("isActionSupported reflects the table", () => {
    expect(isActionSupported(ApplicationType.NEW_REGISTRATION, "APPROVE")).toBe(true);
    expect(isActionSupported(ApplicationType.DEREGISTRATION, "ASSIGN_CERTIFIER")).toBe(false);
  });
});

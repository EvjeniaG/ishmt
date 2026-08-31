import { describe, expect, it } from "vitest";
import { ROLE_CODES } from "@/lib/constants/roles";
import {
  FIELD_INSPECTOR_HIDDEN_ENTITY_TYPES,
  ISHMT_LEADERSHIP_HIDDEN_ENTITY_TYPES,
  isIshmtContractDeadlineNotifyExcludedRole,
  notificationWhereForRole,
} from "@/lib/notifications/field-inspector-notifications";

describe("field-inspector-notifications", () => {
  it("filters broadcast application and citizen_report notifications for field inspector", () => {
    const where = notificationWhereForRole("user-1", ROLE_CODES.FIELD_INSPECTOR);

    expect(where).toEqual({
      userId: "user-1",
      OR: [
        { entityType: null },
        { entityType: { notIn: [...FIELD_INSPECTOR_HIDDEN_ENTITY_TYPES] } },
      ],
    });
  });

  it("filters contract deadline alerts for chief inspector and technical director", () => {
    for (const role of [ROLE_CODES.CHIEF_INSPECTOR, ROLE_CODES.ISHMT_DIRECTOR] as const) {
      expect(notificationWhereForRole("user-1", role)).toEqual({
        userId: "user-1",
        OR: [
          { entityType: null },
          { entityType: { notIn: [...ISHMT_LEADERSHIP_HIDDEN_ENTITY_TYPES] } },
        ],
      });
    }
  });

  it("excludes leadership roles from contract deadline notify recipients", () => {
    expect(isIshmtContractDeadlineNotifyExcludedRole(ROLE_CODES.CHIEF_INSPECTOR)).toBe(true);
    expect(isIshmtContractDeadlineNotifyExcludedRole(ROLE_CODES.ISHMT_DIRECTOR)).toBe(true);
    expect(isIshmtContractDeadlineNotifyExcludedRole(ROLE_CODES.FIELD_INSPECTOR)).toBe(true);
    expect(isIshmtContractDeadlineNotifyExcludedRole(ROLE_CODES.SECTOR_HEAD)).toBe(false);
  });

  it("does not filter operational notifications for sector head", () => {
    expect(notificationWhereForRole("user-1", ROLE_CODES.SECTOR_HEAD)).toEqual({
      userId: "user-1",
    });
  });
});

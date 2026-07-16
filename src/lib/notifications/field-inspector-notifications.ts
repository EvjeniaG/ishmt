import type { Prisma } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { isFieldInspectorRole } from "@/lib/permissions/ishmt-roles";

/** Rolet që përjashtohen nga njoftimet operacionale të ISHMT (aplikime, regjistrime, raportime). */
export const ISHMT_OPERATIONS_NOTIFY_EXCLUDED_ROLES = [ROLE_CODES.FIELD_INSPECTOR] as const;

/** Drejtori teknik dhe kryeinspektori shohin statistikat; nuk marrin njoftime për kontrata/afate. */
export const ISHMT_CONTRACT_DEADLINE_NOTIFY_EXCLUDED_ROLES = [
  ROLE_CODES.FIELD_INSPECTOR,
  ROLE_CODES.CHIEF_INSPECTOR,
  ROLE_CODES.ISHMT_DIRECTOR,
] as const;

/** Llojet e entitetit që inspektori terreni nuk duhet të shohë në njoftime. */
export const FIELD_INSPECTOR_HIDDEN_ENTITY_TYPES = ["application", "citizen_report"] as const;

/** Njoftimet e kontratave/afateve që u fshihen drejtorit dhe kryeinspektorit. */
export const ISHMT_LEADERSHIP_HIDDEN_ENTITY_TYPES = ["ishmt_compliance_alert"] as const;

export function isIshmtContractDeadlineNotifyExcludedRole(roleCode: string | null | undefined): boolean {
  if (!roleCode) return false;
  return (ISHMT_CONTRACT_DEADLINE_NOTIFY_EXCLUDED_ROLES as readonly string[]).includes(roleCode);
}

export function isIshmtLeadershipRole(roleCode: string | null | undefined): boolean {
  if (!roleCode) return false;
  return roleCode === ROLE_CODES.CHIEF_INSPECTOR || roleCode === ROLE_CODES.ISHMT_DIRECTOR;
}

export function notificationWhereForRole(
  userId: string,
  roleCode?: string | null,
): Prisma.NotificationWhereInput {
  if (roleCode && isFieldInspectorRole(roleCode as RoleCode)) {
    return {
      userId,
      OR: [
        { entityType: null },
        { entityType: { notIn: [...FIELD_INSPECTOR_HIDDEN_ENTITY_TYPES] } },
      ],
    };
  }

  if (roleCode && isIshmtLeadershipRole(roleCode)) {
    return {
      userId,
      OR: [
        { entityType: null },
        { entityType: { notIn: [...ISHMT_LEADERSHIP_HIDDEN_ENTITY_TYPES] } },
      ],
    };
  }

  return { userId };
}

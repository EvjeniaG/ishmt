import { OrgType } from "@prisma/client";
import { ORG_TYPE_ALLOWED_ROLES } from "@/lib/constants/org-role-map";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";

export type StaffOrgOption = {
  id: string;
  name: string;
  type: Extract<OrgType, "ISHMT" | "DIRECTORATE">;
};

export const ADMIN_STAFF_ORG_TYPES: OrgType[] = [OrgType.ISHMT, OrgType.DIRECTORATE];

export function rolesForAdminStaffOrg(orgType: OrgType): RoleCode[] {
  if (orgType === OrgType.ISHMT) {
    return ORG_TYPE_ALLOWED_ROLES[OrgType.ISHMT];
  }
  if (orgType === OrgType.DIRECTORATE) {
    return [ROLE_CODES.DIRECTORATE];
  }
  return [];
}

export function isAdminStaffOrgType(orgType: OrgType): boolean {
  return ADMIN_STAFF_ORG_TYPES.includes(orgType);
}

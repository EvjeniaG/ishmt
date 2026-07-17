import { OrgType } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";

/** Valid role codes per organization type */
export const ORG_TYPE_ALLOWED_ROLES: Record<OrgType, RoleCode[]> = {
  [OrgType.OWNER]: [ROLE_CODES.OWNER],
  [OrgType.INSTALLER]: [ROLE_CODES.INSTALLER],
  [OrgType.CERTIFIER]: [ROLE_CODES.CERTIFIER],
  [OrgType.MAINTENANCE]: [ROLE_CODES.MAINTENANCE],
  [OrgType.ISHMT]: [
    ROLE_CODES.ADMIN,
    ROLE_CODES.CHIEF_INSPECTOR,
    ROLE_CODES.ISHMT_DIRECTOR,
    ROLE_CODES.SECTOR_HEAD,
    ROLE_CODES.FIELD_INSPECTOR,
  ],
  [OrgType.DIRECTORATE]: [ROLE_CODES.DIRECTORATE],
};

export function isRoleValidForOrgType(roleCode: RoleCode, orgType: OrgType): boolean {
  return ORG_TYPE_ALLOWED_ROLES[orgType]?.includes(roleCode) ?? false;
}

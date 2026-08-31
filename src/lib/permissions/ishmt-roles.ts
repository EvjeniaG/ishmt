import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";

/** Stafi i brendshëm IQMT (jo Drejtoria e Politikave / kompanitë). */
export const ISHMT_INTERNAL_ROLES: RoleCode[] = [
  ROLE_CODES.CHIEF_INSPECTOR,
  ROLE_CODES.ISHMT_DIRECTOR,
  ROLE_CODES.SECTOR_HEAD,
  ROLE_CODES.FIELD_INSPECTOR,
  ROLE_CODES.ADMIN,
];

/** Mund të caktojnë inspektim në terren dhe të zgjedhin inspektorin. */
export const ISHMT_FIELD_ASSIGNER_ROLES: RoleCode[] = [
  ROLE_CODES.CHIEF_INSPECTOR,
  ROLE_CODES.ISHMT_DIRECTOR,
  ROLE_CODES.SECTOR_HEAD,
];

/** Inspektor që shqyrton dosjen e aplikimit. */
export const ISHMT_FIELD_INSPECTOR_ROLES: RoleCode[] = [ROLE_CODES.FIELD_INSPECTOR];

/** Shqyrtim administrativ i aplikimeve (përgjegjës sektori). */
export const ISHMT_APPLICATION_REVIEW_ROLES: RoleCode[] = [ROLE_CODES.SECTOR_HEAD];

/** Delegim dhe raport drejt kryeinspektorit (drejtor i drejtorisë). */
export const ISHMT_APPLICATION_DIRECTOR_ROLES: RoleCode[] = [ROLE_CODES.ISHMT_DIRECTOR];

/** Marrje e aplikimit dhe miratim final. */
export const ISHMT_APPLICATION_CHIEF_ROLES: RoleCode[] = [ROLE_CODES.CHIEF_INSPECTOR];

/** Miratim final i aplikimeve - vetëm kryeinspektori. */
export const ISHMT_APPLICATION_APPROVE_ROLES: RoleCode[] = [ROLE_CODES.CHIEF_INSPECTOR];

export function isIshmtInternalRole(role: RoleCode): boolean {
  return ISHMT_INTERNAL_ROLES.includes(role);
}

export function canAssignFieldInspections(role: RoleCode): boolean {
  return ISHMT_FIELD_ASSIGNER_ROLES.includes(role);
}

export function isFieldInspectorRole(role: RoleCode): boolean {
  return ISHMT_FIELD_INSPECTOR_ROLES.includes(role);
}

export function canReviewApplications(role: RoleCode): boolean {
  return ISHMT_APPLICATION_REVIEW_ROLES.includes(role);
}

export function canDirectApplications(role: RoleCode): boolean {
  return ISHMT_APPLICATION_DIRECTOR_ROLES.includes(role);
}

export function canChiefHandleApplications(role: RoleCode): boolean {
  return ISHMT_APPLICATION_CHIEF_ROLES.includes(role);
}

export function canApproveApplications(role: RoleCode): boolean {
  return ISHMT_APPLICATION_APPROVE_ROLES.includes(role);
}

/** Për workflow: lejon tranzicionet e vjetra INSPECTOR për rolet e reja. */
export function roleMatchesTransition(actorRole: RoleCode, allowedRoles: RoleCode[]): boolean {
  if (allowedRoles.includes(actorRole)) return true;
  if (allowedRoles.includes(ROLE_CODES.INSPECTOR) && actorRole === ROLE_CODES.FIELD_INSPECTOR) {
    return true;
  }
  return false;
}

export function roleLabelSq(code: RoleCode): string {
  const labels: Partial<Record<RoleCode, string>> = {
    [ROLE_CODES.CHIEF_INSPECTOR]: "Kryeinspektor",
    [ROLE_CODES.ISHMT_DIRECTOR]: "Drejtor i Drejtorisë",
    [ROLE_CODES.SECTOR_HEAD]: "Përgjegjës sektori",
    [ROLE_CODES.FIELD_INSPECTOR]: "Inspektor",
    [ROLE_CODES.INSPECTOR]: "Inspektor",
    [ROLE_CODES.ADMIN]: "Administrator",
  };
  return labels[code] ?? code;
}

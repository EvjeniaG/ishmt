import type { OwnerBuildingRole } from "@prisma/client";
import { OWNER_BUILDING_ROLE_LABELS } from "@/lib/constants/owner-labels";
import { RESPONSIBLE_ENTITY_TYPE_LABELS } from "@/lib/registration/labels";

/** Llojet e lejuara për regjistrim si person përgjegjës - subjekte me NIPT. */
export const REGISTER_OWNER_ENTITY_TYPES = [
  "ADMINISTRATOR",
  "CONSTRUCTION_COMPANY",
] as const satisfies readonly OwnerBuildingRole[];

export type RegisterOwnerEntityType = (typeof REGISTER_OWNER_ENTITY_TYPES)[number];

/** Llojet e njëjta në formularin e aplikimit. */
export const APPLICATION_OWNER_ENTITY_TYPES = [
  "ADMINISTRATOR",
  "CONSTRUCTION_COMPANY",
] as const;

export function ownerBuildingRoleToResponsibleEntityType(
  role: OwnerBuildingRole | null | undefined,
): string | undefined {
  if (!role) return undefined;
  if ((REGISTER_OWNER_ENTITY_TYPES as readonly string[]).includes(role)) {
    return role;
  }
  return undefined;
}

export function responsibleEntityTypeToOwnerBuildingRole(
  type: string | null | undefined,
): OwnerBuildingRole | undefined {
  if (!type) return undefined;
  if ((REGISTER_OWNER_ENTITY_TYPES as readonly string[]).includes(type)) {
    return type as RegisterOwnerEntityType;
  }
  return undefined;
}

export function registerOwnerEntityTypeLabel(role: RegisterOwnerEntityType): string {
  return OWNER_BUILDING_ROLE_LABELS[role];
}

export function applicationOwnerEntityTypeLabel(
  type: (typeof APPLICATION_OWNER_ENTITY_TYPES)[number] | string,
): string {
  if (type in RESPONSIBLE_ENTITY_TYPE_LABELS) {
    return RESPONSIBLE_ENTITY_TYPE_LABELS[type as keyof typeof RESPONSIBLE_ENTITY_TYPE_LABELS];
  }
  return type;
}

export function ownerSubjectNameRequired(role?: RegisterOwnerEntityType | string): boolean {
  return role !== "ADMINISTRATOR";
}

export function ownerRequiresNipt(role?: RegisterOwnerEntityType | string): boolean {
  return role !== "ADMINISTRATOR";
}

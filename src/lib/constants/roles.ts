/**
 * Role codes aligned with docs/architecture/05-user-access-matrix.md
 */
export const ROLE_CODES = {
  PUBLIC: "PUBLIC",
  OWNER: "OWNER",
  INSTALLER: "INSTALLER",
  CERTIFIER: "CERTIFIER",
  MAINTENANCE: "MAINTENANCE",
  /** @deprecated Përdorni FIELD_INSPECTOR - mbetet për anëtarësi ekzistuese */
  INSPECTOR: "INSPECTOR",
  CHIEF_INSPECTOR: "CHIEF_INSPECTOR",
  ISHMT_DIRECTOR: "ISHMT_DIRECTOR",
  SECTOR_HEAD: "SECTOR_HEAD",
  FIELD_INSPECTOR: "FIELD_INSPECTOR",
  ADMIN: "ADMIN",
  /** Drejtoria e Politikave (MPB) - regjistrim kompanish, jo stafi operativ ISHMT */
  DIRECTORATE: "DIRECTORATE",
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

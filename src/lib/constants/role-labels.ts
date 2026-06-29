import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";

/** Albanian display labels aligned with the official role specification. */
export const ROLE_LABELS: Record<RoleCode, string> = {
  [ROLE_CODES.PUBLIC]: "Qytetar Publik",
  [ROLE_CODES.OWNER]: "Personi përgjegjës i ashensorit",
  [ROLE_CODES.INSTALLER]: "Kompani Instaluese",
  [ROLE_CODES.CERTIFIER]: "OMI / Certifikues",
  [ROLE_CODES.MAINTENANCE]: "Kompani Mirëmbajtëse",
  [ROLE_CODES.INSPECTOR]: "Inspektor ISHMT (legacy)",
  [ROLE_CODES.FIELD_INSPECTOR]: "Inspektor terreni",
  [ROLE_CODES.SECTOR_SPECIALIST]: "Specialist sektori",
  [ROLE_CODES.SECTOR_HEAD]: "Përgjegjës i Sektorit të Produkteve Mekanike",
  [ROLE_CODES.ISHMT_DIRECTOR]: "Drejtor Teknik",
  [ROLE_CODES.CHIEF_INSPECTOR]: "Kryeinspektor",
  [ROLE_CODES.ADMIN]: "Administrator ISHMT",
  [ROLE_CODES.DIRECTORATE]: "Drejtoria e Politikave",
};

export function getRoleLabel(roleCode: string): string {
  return ROLE_LABELS[roleCode as RoleCode] ?? roleCode;
}

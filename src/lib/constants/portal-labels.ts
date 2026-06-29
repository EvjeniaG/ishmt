import { ROLE_CODES } from "@/lib/constants/roles";
import { OWNER_PORTAL_EYEBROW } from "@/lib/constants/owner-labels";

export function portalEyebrowForRole(roleCode: string): string | undefined {
  switch (roleCode) {
    case ROLE_CODES.OWNER:
      return OWNER_PORTAL_EYEBROW;
    case ROLE_CODES.INSTALLER:
      return "Portali · Instalues";
    case ROLE_CODES.CERTIFIER:
      return "Portali · OMI";
    case ROLE_CODES.MAINTENANCE:
      return "Portali · Mirëmbajtje";
    default:
      return undefined;
  }
}

import { ROLE_CODES } from "@/lib/constants/roles";
import { OWNER_PORTAL_EYEBROW } from "@/lib/constants/owner-labels";
import {
  capabilityLabels,
  countActiveCapabilities,
  type OrgCapabilities,
} from "@/lib/organizations/org-capabilities";

export function portalEyebrowForCapabilities(
  caps: OrgCapabilities | null | undefined,
  fallbackRole?: string,
): string | undefined {
  if (caps && countActiveCapabilities(caps) > 1) {
    return `Portali · Kompani shërbimi · ${capabilityLabels(caps).join(" · ")}`;
  }
  if (caps?.capInstall) return "Portali · Instalim";
  if (caps?.capMaintenance) return "Portali · Mirëmbajtje";
  if (caps?.capOm) return "Portali · OM";
  return fallbackRole ? portalEyebrowForRole(fallbackRole) : undefined;
}

export function portalEyebrowForRole(roleCode: string): string | undefined {
  switch (roleCode) {
    case ROLE_CODES.OWNER:
      return OWNER_PORTAL_EYEBROW;
    case ROLE_CODES.INSTALLER:
      return "Portali · Instalues";
    case ROLE_CODES.CERTIFIER:
      return "Portali · OM";
    case ROLE_CODES.MAINTENANCE:
      return "Portali · Mirëmbajtje";
    default:
      return undefined;
  }
}

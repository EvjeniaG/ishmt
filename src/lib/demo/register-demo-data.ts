import type { RegisterOwnerEntityType } from "@/lib/registration/owner-entity-role";
import { ownerSubjectNameRequired } from "@/lib/registration/owner-entity-role";
import { REGISTER_OWNER_PRESETS, DEMO_OWNER_ADMINISTRATOR, DEMO_OWNER_CONSTRUCTION } from "@/lib/demo/demo-seed-profiles";
import { nextRegisterDemoInstallClaim } from "@/lib/demo/demo-install-claim-pool";
import { nextRegisterDemoOmClaim } from "@/lib/demo/demo-om-claim-pool";

export type RegisterDemoLevel = "OWNER" | "COMPANY" | "INSTALLER" | "CERTIFIER" | "MAINTENANCE";

export const REGISTER_DEMO_PASSWORD = "Ishmt2026";

export { isRegisterDemoEnabled } from "@/lib/demo/demo-data-mode";
export {
  DEMO_OM_CLAIM_POOL,
  REGISTER_DEMO_OM_CLAIM,
  resetRegisterDemoOmClaimCursor,
} from "@/lib/demo/demo-om-claim-pool";

let demoCounter = 0;

function demoSuffix(): string {
  demoCounter += 1;
  return `${Date.now().toString(36).slice(-4)}${demoCounter}`.toUpperCase();
}

function demoDigits(length = 7): string {
  const seed = Date.now() % 10 ** length;
  return String(seed).padStart(length, "0").slice(-length);
}

const OWNER_DEMO_BY_ROLE = REGISTER_OWNER_PRESETS;

const OWNER_DEMO_PROFILES = {
  ADMINISTRATOR: DEMO_OWNER_ADMINISTRATOR,
  CONSTRUCTION_COMPANY: DEMO_OWNER_CONSTRUCTION,
} as const;

/** Të dhëna fiktive unike për testimin e regjistrimit dhe pipeline-it. */
export function buildRegisterDemoData(input: {
  level: RegisterDemoLevel;
  ownerBuildingRole?: RegisterOwnerEntityType;
  capabilities?: Array<"capInstall" | "capMaintenance" | "capOm">;
}): Record<string, string> {
  const suffix = demoSuffix();
  const digits = demoDigits();
  const shared = {
    email: `demo.${input.level.toLowerCase()}.${suffix}@ishmtt.test`,
    password: REGISTER_DEMO_PASSWORD,
    confirmPassword: REGISTER_DEMO_PASSWORD,
    phone: `+35569${demoDigits(7)}`,
  };

  switch (input.level) {
    case "OWNER": {
      const role = input.ownerBuildingRole ?? "ADMINISTRATOR";
      const preset = OWNER_DEMO_BY_ROLE[role];
      const profile = OWNER_DEMO_PROFILES[role];
      return {
        ...shared,
        email: profile.email,
        phone: profile.phone,
        ownerBuildingRole: role,
        personalNumber: profile.nid,
        firstName: preset.firstName,
        fatherName: preset.fatherName,
        lastName: preset.lastName,
        birthDate: profile.birthDate,
        ...(preset.nipt ? { nipt: preset.nipt } : { nipt: "" }),
        ...(ownerSubjectNameRequired(role)
          ? { organizationName: preset.orgName }
          : {}),
      };
    }
    case "COMPANY":
    case "INSTALLER":
    case "CERTIFIER":
    case "MAINTENANCE": {
      const caps = input.capabilities ?? [];
      const wantsInstall = caps.includes("capInstall") || input.level === "INSTALLER";
      const wantsOm = caps.includes("capOm") || input.level === "CERTIFIER";
      const installClaim = wantsInstall ? nextRegisterDemoInstallClaim() : null;
      const omClaim = wantsOm ? nextRegisterDemoOmClaim() : null;
      const primaryClaim = installClaim ?? omClaim;

      if (!primaryClaim) {
        return {
          ...shared,
          firstName: "Bledar",
          lastName: "Shehu",
        };
      }

      return {
        ...shared,
        nipt: primaryClaim.nipt,
        organizationName: primaryClaim.orgName,
        ...(installClaim ? { installLicenseNumber: installClaim.licenseNumber } : {}),
        ...(omClaim ? { omLicenseNumber: omClaim.licenseNumber } : {}),
        firstName: "Bledar",
        lastName: "Shehu",
      };
    }
    default:
      return shared;
  }
}

export const REGISTER_DEMO_LEVEL_LABELS: Record<RegisterDemoLevel, string> = {
  OWNER: "Person përgjegjës i ashensorit",
  COMPANY: "Kompani",
  INSTALLER: "Kompani instaluese",
  CERTIFIER: "Trup c",
  MAINTENANCE: "Kompani mirëmbajtjeje",
};

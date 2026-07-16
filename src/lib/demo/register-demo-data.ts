export type RegisterDemoLevel = "OWNER" | "INSTALLER" | "CERTIFIER" | "MAINTENANCE";

export const REGISTER_DEMO_PASSWORD = "Ishmt2026";

export { isRegisterDemoEnabled } from "@/lib/demo/demo-data-mode";

let demoCounter = 0;

function demoSuffix(): string {
  demoCounter += 1;
  return `${Date.now().toString(36).slice(-4)}${demoCounter}`.toUpperCase();
}

function demoDigits(length = 7): string {
  const seed = Date.now() % 10 ** length;
  return String(seed).padStart(length, "0").slice(-length);
}

/** Të dhëna fiktive unike për testimin e regjistrimit dhe pipeline-it. */
export function buildRegisterDemoData(input: {
  level: RegisterDemoLevel;
  municipalityId: string;
}): Record<string, string> {
  const suffix = demoSuffix();
  const digits = demoDigits();
  const shared = {
    email: `demo.${input.level.toLowerCase()}.${suffix}@ishmtt.test`,
    password: REGISTER_DEMO_PASSWORD,
    confirmPassword: REGISTER_DEMO_PASSWORD,
    phone: `+35569${demoDigits(7)}`,
    municipalityId: input.municipalityId,
  };

  switch (input.level) {
    case "OWNER":
      return {
        ...shared,
        personalNumber: `I9${digits}D`,
        idCardNumber: `ID${suffix}`,
        firstName: "Arben",
        fatherName: "Përparim",
        lastName: "Demo",
        motherName: "Elena",
        birthDate: "1985-06-15",
        organizationName: `Pronar Demo ${suffix}`,
      };
    case "INSTALLER":
      return {
        ...shared,
        nipt: `L1${digits}A`,
        organizationName: `Instalime Demo ${suffix}`,
        firstName: "Bledar",
        lastName: "Shehu",
      };
    case "CERTIFIER":
      return {
        ...shared,
        nipt: `M2${digits}B`,
        organizationName: `OMI Demo ${suffix}`,
        firstName: "Dritan",
        lastName: "Hoxha",
      };
    case "MAINTENANCE":
      return {
        ...shared,
        nipt: `N3${digits}C`,
        organizationName: `Servis Demo ${suffix}`,
        firstName: "Ermal",
        lastName: "Kola",
      };
    default:
      return shared;
  }
}

export const REGISTER_DEMO_LEVEL_LABELS: Record<RegisterDemoLevel, string> = {
  OWNER: "Person përgjegjës i ashensorit",
  INSTALLER: "Kompani instaluese",
  CERTIFIER: "Trup certifikues / OMI",
  MAINTENANCE: "Kompani mirëmbajtjeje",
};

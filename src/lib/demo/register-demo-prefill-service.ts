import { isRegisterDemoEnabled } from "@/lib/demo/demo-data-mode";
import {
  DEMO_DUAL_LICENSE_CLAIM_POOL,
  type DemoDualLicenseClaimProfile,
} from "@/lib/demo/demo-dual-license-claim-pool";
import {
  DEMO_INSTALL_CLAIM_POOL,
  type DemoInstallClaimProfile,
} from "@/lib/demo/demo-install-claim-pool";
import { DEMO_OM_CLAIM_POOL, type DemoOmClaimProfile } from "@/lib/demo/demo-om-claim-pool";
import { REGISTER_DEMO_PASSWORD } from "@/lib/demo/register-demo-data";
import {
  LicensedCompanyRegistrationService,
  type NiptLookupStatus,
} from "@/lib/services/licensed-company-registration-service";
import {
  InstallLicenseRegistrationService,
  OmLicenseRegistrationService,
} from "@/lib/services/om-license-registration-service";

export type RegisterDemoCompanyMode = "install" | "om" | "installOm" | "maintenance";

export type RegisterDemoCompanyPrefill = {
  mode: RegisterDemoCompanyMode;
  values: Record<string, string>;
  niptLookupStatus: Exclude<NiptLookupStatus, { status: "TOO_SHORT" }>;
  wantMaintenance: boolean;
};

function demoSuffix(): string {
  return `${Date.now().toString(36).slice(-4)}`.toUpperCase();
}

function demoDigits(length = 7): string {
  const seed = Date.now() % 10 ** length;
  return String(seed).padStart(length, "0").slice(-length);
}

function buildSharedDemoFields(suffix: string) {
  return {
    email: `demo.company.${suffix}@ishmtt.test`,
    password: REGISTER_DEMO_PASSWORD,
    confirmPassword: REGISTER_DEMO_PASSWORD,
    phone: `+35569${demoDigits(7)}`,
    firstName: "Bledar",
    lastName: "Shehu",
  };
}

async function findAvailableDualClaim(): Promise<DemoDualLicenseClaimProfile | null> {
  for (const claim of DEMO_DUAL_LICENSE_CLAIM_POOL) {
    const [installStatus, omStatus] = await Promise.all([
      InstallLicenseRegistrationService.lookupLicenseStatus({
        licenseNumber: claim.installLicenseNumber,
        nipt: claim.nipt,
      }),
      OmLicenseRegistrationService.lookupLicenseStatus({
        licenseNumber: claim.omLicenseNumber,
        nipt: claim.nipt,
      }),
    ]);
    if (
      installStatus.status === "AVAILABLE" &&
      installStatus.niptVerified &&
      omStatus.status === "AVAILABLE" &&
      omStatus.niptVerified
    ) {
      return claim;
    }
  }
  return null;
}

async function findAvailableInstallClaim(): Promise<DemoInstallClaimProfile | null> {
  for (const claim of DEMO_INSTALL_CLAIM_POOL) {
    const status = await InstallLicenseRegistrationService.lookupLicenseStatus({
      licenseNumber: claim.licenseNumber,
      nipt: claim.nipt,
    });
    if (status.status === "AVAILABLE" && status.niptVerified) {
      return claim;
    }
  }
  return null;
}

async function findAvailableOmClaim(): Promise<DemoOmClaimProfile | null> {
  for (const claim of DEMO_OM_CLAIM_POOL) {
    const status = await OmLicenseRegistrationService.lookupLicenseStatus({
      licenseNumber: claim.licenseNumber,
      nipt: claim.nipt,
    });
    if (status.status === "AVAILABLE" && status.niptVerified) {
      return claim;
    }
  }
  return null;
}

async function buildUniqueMaintenanceNipt(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const nipt = `R${demoDigits(8)}R`;
    const status = await LicensedCompanyRegistrationService.lookupNiptStatus(nipt);
    if (status.status === "NOT_IN_DIRECTORATE") {
      return nipt;
    }
  }
  throw new Error("Nuk u gjenerua dot NIPT demo i lirë për mirëmbajtje.");
}

export async function buildRegisterDemoCompanyPrefill(
  mode: RegisterDemoCompanyMode,
): Promise<RegisterDemoCompanyPrefill> {
  if (!isRegisterDemoEnabled()) {
    throw new Error("Mjetet demo nuk janë të aktivizuara.");
  }

  const suffix = demoSuffix();
  const shared = buildSharedDemoFields(suffix);

  if (mode === "install") {
    const claim = await findAvailableInstallClaim();
    if (!claim) {
      throw new Error("Nuk ka licencë demo instalimi të lirë. Ekzekutoni: npm run db:seed");
    }

    const niptLookupStatus = await LicensedCompanyRegistrationService.lookupNiptStatus(claim.nipt);
    if (niptLookupStatus.status !== "DIRECTORATE_REGISTERED") {
      throw new Error("Licenca demo e instalimit nuk u gjet në regjistrin e Drejtorisë.");
    }

    return {
      mode,
      wantMaintenance: false,
      niptLookupStatus,
      values: {
        ...shared,
        nipt: claim.nipt,
        organizationName: claim.orgName,
        installLicenseNumber: claim.licenseNumber,
      },
    };
  }

  if (mode === "om") {
    const claim = await findAvailableOmClaim();
    if (!claim) {
      throw new Error("Nuk ka licencë demo OM të lirë. Ekzekutoni: npm run db:seed");
    }

    const niptLookupStatus = await LicensedCompanyRegistrationService.lookupNiptStatus(claim.nipt);
    if (niptLookupStatus.status !== "DIRECTORATE_REGISTERED") {
      throw new Error("Licenca demo OM nuk u gjet në regjistrin e Drejtorisë.");
    }

    return {
      mode,
      wantMaintenance: false,
      niptLookupStatus,
      values: {
        ...shared,
        nipt: claim.nipt,
        organizationName: claim.orgName,
        omLicenseNumber: claim.licenseNumber,
      },
    };
  }

  if (mode === "installOm") {
    const claim = await findAvailableDualClaim();
    if (!claim) {
      throw new Error(
        "Nuk ka kompani demo me instalim + OM të lirë. Ekzekutoni: npm run db:seed",
      );
    }

    const niptLookupStatus = await LicensedCompanyRegistrationService.lookupNiptStatus(claim.nipt);
    if (
      niptLookupStatus.status !== "DIRECTORATE_REGISTERED" ||
      !niptLookupStatus.capabilities.capInstall ||
      !niptLookupStatus.capabilities.capOm
    ) {
      throw new Error("Kompania demo instalim + OM nuk u gjet në regjistrin e Drejtorisë.");
    }

    return {
      mode,
      wantMaintenance: false,
      niptLookupStatus,
      values: {
        ...shared,
        nipt: claim.nipt,
        organizationName: claim.orgName,
        installLicenseNumber: claim.installLicenseNumber,
        omLicenseNumber: claim.omLicenseNumber,
      },
    };
  }

  const nipt = await buildUniqueMaintenanceNipt();
  const niptLookupStatus = await LicensedCompanyRegistrationService.lookupNiptStatus(nipt);
  if (niptLookupStatus.status !== "NOT_IN_DIRECTORATE") {
    throw new Error("NIPT-i demo për mirëmbajtje duhet të jetë i lirë në regjistrin e Drejtorisë.");
  }

  return {
    mode,
    wantMaintenance: true,
    niptLookupStatus,
    values: {
      ...shared,
      nipt,
      organizationName: `Kompani Mirëmbajtje Demo ${suffix} Sh.p.k.`,
    },
  };
}

export function registerDemoCompanyModeLabel(mode: RegisterDemoCompanyMode): string {
  switch (mode) {
    case "install":
      return "Instalues";
    case "om":
      return "OM / certifikues";
    case "installOm":
      return "Instalim + OM";
    case "maintenance":
      return "Mirëmbajtje";
  }
}

export const REGISTER_DEMO_COMPANY_MODES: RegisterDemoCompanyMode[] = [
  "install",
  "om",
  "installOm",
  "maintenance",
];

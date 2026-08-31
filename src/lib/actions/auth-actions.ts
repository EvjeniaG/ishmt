"use server";

import { AuthService } from "@/lib/services/auth-service";
import { OmLicenseRegistrationService, InstallLicenseRegistrationService } from "@/lib/services/om-license-registration-service";
import {
  accountRegisterSchema,
  forgotPasswordSchema,
  maintenanceRegisterSchema,
  ownerRegisterSchema,
  parseCapabilityFlag,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { enforcePublicActionRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { buildRegisterDemoCompanyPrefill, type RegisterDemoCompanyMode } from "@/lib/demo/register-demo-prefill-service";
import { LicensedCompanyRegistrationService } from "@/lib/services/licensed-company-registration-service";
import { isRegisterDemoEnabled } from "@/lib/demo/demo-data-mode";

async function checkRateLimit(action: string) {
  try {
    await enforcePublicActionRateLimit(action, RATE_LIMITS.AUTH_SENSITIVE_PER_MINUTE);
    return null;
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Shumë kërkesa." };
  }
}

export async function fetchRegisterDemoCompanyPrefillAction(mode: RegisterDemoCompanyMode) {
  if (!isRegisterDemoEnabled()) {
    return { success: false as const, error: "Mjetet demo nuk janë të aktivizuara." };
  }

  try {
    const data = await buildRegisterDemoCompanyPrefill(mode);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Plotësimi demo dështoi.",
    };
  }
}

export async function lookupCompanyNiptAction(nipt: string) {
  const limited = await checkRateLimit("lookup-company-nipt");
  if (limited) return limited;

  try {
    const data = await LicensedCompanyRegistrationService.lookupNiptStatus(nipt);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Verifikimi i NIPT-it dështoi.",
    };
  }
}

export async function lookupInstallLicenseAction(licenseNumber: string, nipt?: string) {
  const limited = await checkRateLimit("lookup-install-license");
  if (limited) return limited;

  try {
    const data = await InstallLicenseRegistrationService.lookupLicenseStatus({
      licenseNumber,
      nipt,
    });
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Verifikimi i licencës dështoi.",
    };
  }
}

export async function lookupOmLicenseAction(licenseNumber: string, nipt?: string) {
  const limited = await checkRateLimit("lookup-om-license");
  if (limited) return limited;

  try {
    const data = await OmLicenseRegistrationService.lookupLicenseStatus({
      licenseNumber,
      nipt,
    });
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Verifikimi i licencës dështoi.",
    };
  }
}

export async function registerAccountAction(formData: FormData) {
  const limited = await checkRateLimit("register");
  if (limited) return limited;
  const parsed = accountRegisterSchema.safeParse({
    level: formData.get("level"),
    capInstall: parseCapabilityFlag(formData.get("capInstall")),
    capMaintenance: parseCapabilityFlag(formData.get("capMaintenance")),
    capOm: parseCapabilityFlag(formData.get("capOm")),
    omLicenseNumber: formData.get("omLicenseNumber") || undefined,
    installLicenseNumber: formData.get("installLicenseNumber") || undefined,
    personalNumber: formData.get("personalNumber") || undefined,
    idCardNumber: formData.get("idCardNumber") || undefined,
    firstName: formData.get("firstName"),
    fatherName: formData.get("fatherName") || undefined,
    lastName: formData.get("lastName"),
    motherName: formData.get("motherName") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    organizationName: formData.get("organizationName") || undefined,
    ownerBuildingRole: formData.get("ownerBuildingRole") || undefined,
    nipt: formData.get("nipt") || undefined,
    municipalityId: formData.get("municipalityId") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    await AuthService.registerAccount(parsed.data);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Regjistrimi dështoi",
    };
  }
}

export async function registerOwnerAction(formData: FormData) {
  const limited = await checkRateLimit("register");
  if (limited) return limited;
  const parsed = ownerRegisterSchema.safeParse({
    personalNumber: formData.get("personalNumber"),
    idCardNumber: formData.get("idCardNumber"),
    firstName: formData.get("firstName"),
    fatherName: formData.get("fatherName"),
    lastName: formData.get("lastName"),
    motherName: formData.get("motherName"),
    birthDate: formData.get("birthDate"),
    municipalityId: formData.get("municipalityId"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    organizationName: formData.get("organizationName") || undefined,
    nipt: formData.get("nipt") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    await AuthService.registerOwner(parsed.data);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Regjistrimi dështoi",
    };
  }
}

export async function registerMaintenanceAction(formData: FormData) {
  const limited = await checkRateLimit("register");
  if (limited) return limited;
  const parsed = maintenanceRegisterSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    organizationName: formData.get("organizationName"),
    nipt: formData.get("nipt"),
    municipalityId: formData.get("municipalityId"),
    address: formData.get("address") || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    await AuthService.registerMaintenance(parsed.data);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Regjistrimi dështoi",
    };
  }
}

export async function forgotPasswordAction(formData: FormData) {
  const limited = await checkRateLimit("password-reset");
  if (limited) return limited;
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { success: false as const, error: "Email i pavlefshëm" };
  }

  await AuthService.createPasswordResetToken(parsed.data.email);

  return {
    success: true as const,
    message: "Nëse email ekziston, u dërgua udhëzimi për rivendosjen (kontrolloni konsolën në dev).",
  };
}

export async function resetPasswordAction(formData: FormData) {
  const limited = await checkRateLimit("password-reset");
  if (limited) return limited;
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    await AuthService.resetPassword(parsed.data.token, parsed.data.password);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Rivendosja dështoi",
    };
  }
}

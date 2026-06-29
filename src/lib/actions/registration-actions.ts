"use server";

import { revalidatePath } from "next/cache";
import { RegistrationService } from "@/lib/services/registration-service";
import { requirePermission, requireRole } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";
import { registrationBasicDataSchema } from "@/lib/validations/registration-basic-data";
import { registrationTechnicalDataSchema } from "@/lib/validations/registration-technical-data";
import { registrationCertificationDataSchema } from "@/lib/validations/registration-certification-data";

function revalidateRegistration(applicationId: string) {
  revalidatePath("/portal/applications");
  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath(`/portal/applications/${applicationId}/basic-data`);
  revalidatePath(`/portal/applications/${applicationId}/select-installer`);
  revalidatePath(`/portal/applications/${applicationId}/installer/accept`);
  revalidatePath(`/portal/applications/${applicationId}/technical-data`);
  revalidatePath(`/portal/applications/${applicationId}/select-certifier`);
  revalidatePath(`/portal/applications/${applicationId}/certifier/accept`);
  revalidatePath(`/portal/applications/${applicationId}/certification-data`);
  revalidatePath(`/portal/applications/${applicationId}/final-review`);
}

export async function saveRegistrationBasicDataAction(applicationId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = registrationBasicDataSchema.safeParse({
    ...raw,
    existingRegisteredElevatorsCount: raw.existingRegisteredElevatorsCount || undefined,
    saveAsDraft: raw.saveAsDraft ?? "false",
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_EDIT_DRAFT);
    await RegistrationService.updateBasicData(ctx, applicationId, parsed.data);
    revalidateRegistration(applicationId);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Ruajtja dështoi" };
  }
}

export async function assignRegistrationInstallerAction(applicationId: string, installerOrgId: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_ASSIGN_INSTALLER);
    await RegistrationService.assignInstaller(ctx, applicationId, installerOrgId);
    revalidateRegistration(applicationId);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Caktimi dështoi" };
  }
}

export async function respondInstallerDelegationAction(applicationId: string, accept: boolean) {
  try {
    const ctx = await requireRole(ROLE_CODES.INSTALLER);
    await RegistrationService.respondInstallerDelegation(ctx, applicationId, accept);
    revalidateRegistration(applicationId);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Veprimi dështoi" };
  }
}

export async function submitRegistrationTechnicalDataAction(applicationId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = registrationTechnicalDataSchema.safeParse({
    ...raw,
    model: raw.model || undefined,
    capacityPersons: raw.capacityPersons || undefined,
    commissioningDate: raw.commissioningDate || undefined,
    cabinDimensions: raw.cabinDimensions || undefined,
    doorDimensions: raw.doorDimensions || undefined,
    installerTechnicalNotes: raw.installerTechnicalNotes || undefined,
    elevatorDriveTypeOther: raw.elevatorDriveTypeOther || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_FILL_TECHNICAL);
    await RegistrationService.submitTechnicalData(ctx, applicationId, parsed.data);
    revalidateRegistration(applicationId);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Dorëzimi dështoi" };
  }
}

export async function assignRegistrationCertifierAction(applicationId: string, certifierOrgId: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_ASSIGN_CERTIFIER);
    await RegistrationService.assignCertifier(ctx, applicationId, certifierOrgId);
    revalidateRegistration(applicationId);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Caktimi dështoi" };
  }
}

export async function respondCertifierDelegationAction(applicationId: string, accept: boolean) {
  try {
    const ctx = await requireRole(ROLE_CODES.CERTIFIER);
    await RegistrationService.respondCertifierDelegation(ctx, applicationId, accept);
    revalidateRegistration(applicationId);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Veprimi dështoi" };
  }
}

export async function submitRegistrationCertificationAction(applicationId: string, formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = registrationCertificationDataSchema.safeParse({
    ...raw,
    certifierResponsiblePerson: raw.certifierResponsiblePerson || undefined,
    reportNumber: raw.reportNumber || undefined,
    euDeclarationNumber: raw.euDeclarationNumber || undefined,
    certifierTechnicalNotes: raw.certifierTechnicalNotes || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_UPLOAD_CERTIFICATION);
    await RegistrationService.submitCertificationData(ctx, applicationId, parsed.data);
    revalidateRegistration(applicationId);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Dorëzimi dështoi" };
  }
}

export async function submitRegistrationToIshmtAction(applicationId: string, confirmed: boolean) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_SUBMIT);
    await RegistrationService.submitToIshmt(ctx, applicationId, confirmed);
    revalidateRegistration(applicationId);
    revalidatePath("/ishmt/review");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Parashtrimi dështoi" };
  }
}

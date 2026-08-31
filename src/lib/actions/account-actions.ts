"use server";

import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { AuditService } from "@/lib/audit/audit-service";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import {
  companyContactProfileSchema,
  ownerContactProfileSchema,
  staffContactProfileSchema,
} from "@/lib/validations/account-profile";
import { AccountSecurityService } from "@/lib/services/account-security-service";
import {
  changeEmailSchema,
  changePasswordSchema,
  twoFactorCodeSchema,
  twoFactorPasswordSchema,
} from "@/lib/validations/auth";

function revalidateProfilePaths() {
  revalidatePath("/portal/profile");
  revalidatePath("/portal/settings/organization");
  revalidatePath("/portal/dashboard");
  revalidatePath("/portal/applications");
  revalidatePath("/ishmt/dashboard");
  revalidatePath("/ishmt/chief/dashboard");
  revalidatePath("/directorate/dashboard");
}

async function persistUserProfileUpdate(
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    fatherName?: string | null;
    phone?: string | null;
    nid?: string | null;
    birthDate?: string | null;
  },
) {
  const before = await db.authUser.findUnique({ where: { id: userId } });
  if (!before) throw new Error("Përdoruesi nuk u gjet.");

  await db.$transaction(async (tx) => {
    const updated = await tx.authUser.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        fatherName: data.fatherName ?? null,
        phone: data.phone ?? null,
        nid: data.nid ?? null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
      },
    });

    await AuditService.log(
      {
        actorId: userId,
        action: AuditAction.UPDATE,
        entityType: "auth_user",
        entityId: userId,
        beforeState: {
          firstName: before.firstName,
          lastName: before.lastName,
          fatherName: before.fatherName,
          phone: before.phone,
          nid: before.nid,
          birthDate: before.birthDate,
        },
        afterState: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          fatherName: updated.fatherName,
          phone: updated.phone,
          nid: updated.nid,
          birthDate: updated.birthDate,
        },
      },
      tx,
    );
  });
}

export async function updateOwnerContactProfileAction(formData: FormData) {
  const parsed = ownerContactProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    fatherName: formData.get("fatherName"),
    personalNumber: formData.get("personalNumber"),
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.AUTH_PROFILE_EDIT);
    await persistUserProfileUpdate(ctx.userId, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      fatherName: parsed.data.fatherName,
      phone: parsed.data.phone,
      nid: parsed.data.personalNumber,
      birthDate: parsed.data.birthDate,
    });
    revalidateProfilePaths();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përditësimi dështoi",
    };
  }
}

export async function updateCompanyContactProfileAction(formData: FormData) {
  const parsed = companyContactProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    personalNumber: formData.get("personalNumber") || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.AUTH_PROFILE_EDIT);
    await persistUserProfileUpdate(ctx.userId, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      phone: parsed.data.phone,
      nid: parsed.data.personalNumber?.trim() || null,
    });
    revalidateProfilePaths();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përditësimi dështoi",
    };
  }
}

export async function updateStaffContactProfileAction(formData: FormData) {
  const parsed = staffContactProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    fatherName: formData.get("fatherName") || undefined,
    phone: formData.get("phone") || undefined,
    nid: formData.get("nid") || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.AUTH_PROFILE_EDIT);
    await persistUserProfileUpdate(ctx.userId, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      fatherName: parsed.data.fatherName?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      nid: parsed.data.nid?.trim() || null,
    });
    revalidateProfilePaths();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përditësimi dështoi",
    };
  }
}

/** @deprecated Përdorni updateOwnerContactProfileAction */
export async function updateAccountProfileAction(formData: FormData) {
  const personalNumber = formData.get("personalNumber") ?? formData.get("nid");
  const fd = new FormData();
  for (const key of ["firstName", "lastName", "fatherName", "birthDate", "phone"] as const) {
    const value = formData.get(key);
    if (value !== null) fd.set(key, value);
  }
  if (personalNumber !== null) fd.set("personalNumber", personalNumber);
  return updateOwnerContactProfileAction(fd);
}

export async function changePasswordAction(formData: FormData) {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.AUTH_PROFILE_EDIT);
    await AccountSecurityService.changePassword(
      ctx.userId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    revalidateProfilePaths();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Ndryshimi i fjalëkalimit dështoi",
    };
  }
}

export async function requestEmailChangeAction(formData: FormData) {
  const parsed = changeEmailSchema.safeParse({
    newEmail: formData.get("newEmail"),
    currentPassword: formData.get("currentPassword"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.AUTH_PROFILE_EDIT);
    const result = await AccountSecurityService.requestEmailChange(
      ctx.userId,
      parsed.data.newEmail,
      parsed.data.currentPassword,
    );
    revalidateProfilePaths();
    return {
      success: true as const,
      pendingEmail: result.pendingEmail,
      message:
        "U dërgua linku i verifikimit te email i ri (në dev, shikoni konsolën e serverit).",
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Kërkesa për ndryshim email-i dështoi",
    };
  }
}

export async function beginTwoFactorSetupAction(formData: FormData) {
  const parsed = twoFactorPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.AUTH_PROFILE_EDIT);
    const setup = await AccountSecurityService.beginTwoFactorSetup(
      ctx.userId,
      parsed.data.currentPassword,
    );
    revalidateProfilePaths();
    return { success: true as const, ...setup };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Konfigurimi i 2FA dështoi",
    };
  }
}

export async function enableTwoFactorAction(formData: FormData) {
  const parsed = twoFactorCodeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.AUTH_PROFILE_EDIT);
    await AccountSecurityService.enableTwoFactor(
      ctx.userId,
      parsed.data.currentPassword,
      parsed.data.code,
    );
    revalidateProfilePaths();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Aktivizimi i 2FA dështoi",
    };
  }
}

export async function disableTwoFactorAction(formData: FormData) {
  const parsed = twoFactorCodeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    code: formData.get("code"),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.AUTH_PROFILE_EDIT);
    await AccountSecurityService.disableTwoFactor(
      ctx.userId,
      parsed.data.currentPassword,
      parsed.data.code,
    );
    revalidateProfilePaths();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Çaktivizimi i 2FA dështoi",
    };
  }
}

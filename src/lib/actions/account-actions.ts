"use server";

import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { AuditService } from "@/lib/audit/audit-service";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ownerUserProfileSchema } from "@/lib/validations/owner-application";
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

export async function updateAccountProfileAction(formData: FormData) {
  const parsed = ownerUserProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") || undefined,
    nid: formData.get("nid") || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.AUTH_PROFILE_EDIT);
    const before = await db.authUser.findUnique({ where: { id: ctx.userId } });
    if (!before) throw new Error("Përdoruesi nuk u gjet.");

    await db.$transaction(async (tx) => {
      const updated = await tx.authUser.update({
        where: { id: ctx.userId },
        data: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          phone: parsed.data.phone || null,
          nid: parsed.data.nid || null,
        },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "auth_user",
          entityId: ctx.userId,
          beforeState: {
            firstName: before.firstName,
            lastName: before.lastName,
            phone: before.phone,
            nid: before.nid,
          },
          afterState: {
            firstName: updated.firstName,
            lastName: updated.lastName,
            phone: updated.phone,
            nid: updated.nid,
          },
        },
        tx,
      );
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

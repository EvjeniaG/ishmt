"use server";

import { revalidatePath } from "next/cache";
import { QkbValidationService } from "@/lib/services/qkb-validation-service";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";

export async function submitNiptAction(formData: FormData) {
  try {
    const ctx = await requirePermission(PERMISSIONS.QKB_SUBMIT);
    const nipt = String(formData.get("nipt"));

    await QkbValidationService.submitNipt(ctx, nipt);
    revalidatePath("/portal/settings/organization/qkb");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Parashtrimi dështoi",
    };
  }
}

export async function approveQkbAction(validationId: string, formData: FormData) {
  try {
    const ctx = await requirePermission(PERMISSIONS.QKB_VALIDATE_MANUAL);

    await QkbValidationService.approve(ctx, validationId, {
      verifiedCompanyName: String(formData.get("verifiedCompanyName") || "") || undefined,
      notes: String(formData.get("notes") || "") || undefined,
    });

    revalidatePath("/ishmt/admin/qkb-validation");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Aprovimi dështoi",
    };
  }
}

export async function rejectQkbAction(validationId: string, formData: FormData) {
  try {
    const ctx = await requirePermission(PERMISSIONS.QKB_VALIDATE_MANUAL);
    const reason = String(formData.get("reason"));

    if (!reason) {
      return { success: false as const, error: "Arsyeja është e detyrueshme" };
    }

    await QkbValidationService.reject(ctx, validationId, reason);
    revalidatePath("/ishmt/admin/qkb-validation");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Refuzimi dështoi",
    };
  }
}

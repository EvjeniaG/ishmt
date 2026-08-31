"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission, hasPermission, AuthError } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { SystemConfigService } from "@/lib/services/system-config-service";
import { UserAdminService } from "@/lib/services/user-admin-service";
import { ComplianceService } from "@/lib/services/compliance-service";
import { BuildingService } from "@/lib/services/building-service";
import { ROLE_CODES } from "@/lib/constants/roles";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function fail<T = void>(error: unknown): ActionResult<T> {
  return { success: false, error: error instanceof Error ? error.message : "Veprimi dështoi" };
}

export async function updateSystemConfigAction(
  key: string,
  value: unknown,
  description?: string,
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission(PERMISSIONS.USERS_MANAGE_ALL);
    await SystemConfigService.update(key, value, ctx.userId, description);
    revalidatePath("/ishmt/admin/config");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const ctx = await requirePermission(PERMISSIONS.USERS_MANAGE_ALL);
    await UserAdminService.setActive(ctx, userId, isActive);
    revalidatePath("/ishmt/admin/users");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function unlockUserAction(userId: string): Promise<ActionResult> {
  try {
    const ctx = await requirePermission(PERMISSIONS.USERS_MANAGE_ALL);
    await UserAdminService.unlockAccount(ctx, userId);
    revalidatePath("/ishmt/admin/users");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function adminResetUserPasswordAction(
  userId: string,
): Promise<ActionResult<{ email: string; temporaryPassword: string }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.USERS_MANAGE_ALL);
    const data = await UserAdminService.resetPassword(ctx, userId);
    revalidatePath("/ishmt/admin/users");
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function adminCreatePasswordResetLinkAction(
  userId: string,
): Promise<ActionResult<{ email: string; resetUrl: string; expiresAt: Date }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.USERS_MANAGE_ALL);
    const data = await UserAdminService.createPasswordResetLink(ctx, userId);
    revalidatePath("/ishmt/admin/users");
    return { success: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function recalculateComplianceAction(elevatorId?: string): Promise<ActionResult<{ processed: number }>> {
  try {
    const ctx = await requireAuth();
    if (ctx.roleCode !== ROLE_CODES.ADMIN) {
      throw new AuthError("Vetëm administratori mund të rillogaritë përputhshmërinë.", 403);
    }

    if (elevatorId) {
      await ComplianceService.recalculateForElevator(elevatorId);
      revalidatePath(`/ishmt/elevators/${elevatorId}`);
      return { success: true, data: { processed: 1 } };
    }

    const result = await ComplianceService.recalculateAll();
    revalidatePath("/ishmt/dashboard");
    revalidatePath("/ishmt/compliance");
    return { success: true, data: result };
  } catch (error) {
    return fail(error);
  }
}

export async function backfillBuildingsAction(): Promise<ActionResult<{ linked: number }>> {
  try {
    const ctx = await requirePermission(PERMISSIONS.USERS_MANAGE_ALL);
    const result = await BuildingService.backfillFromElevators(ctx.userId);
    revalidatePath("/ishmt/buildings");
    return { success: true, data: result };
  } catch (error) {
    return fail(error);
  }
}

export async function requireIshmtAccess() {
  const ctx = await requireAuth();
  if (!hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL)) {
    throw new AuthError("Nuk keni leje IQMT.", 403);
  }
  return ctx;
}

export async function requireAuditSystemAccess() {
  const ctx = await requireAuth();
  if (
    !hasPermission(ctx, PERMISSIONS.AUDIT_VIEW_SYSTEM) &&
    !hasPermission(ctx, PERMISSIONS.AUDIT_VIEW_ENTITY)
  ) {
    throw new AuthError("Nuk keni leje për audit log.", 403);
  }
  return ctx;
}

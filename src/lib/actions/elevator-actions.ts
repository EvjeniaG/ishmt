"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ElevatorService } from "@/lib/services/elevator-service";

export async function recordPhysicalVerificationAction(elevatorId: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    await ElevatorService.recordPhysicalVerification(ctx, elevatorId);
    revalidatePath(`/portal/elevators/${elevatorId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Regjistrimi dështoi",
    };
  }
}

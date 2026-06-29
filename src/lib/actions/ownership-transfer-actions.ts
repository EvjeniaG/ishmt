"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import { OwnershipTransferService } from "@/lib/services/ownership-transfer-service";

function revalidateOwnershipPaths(applicationId: string) {
  revalidatePath("/portal/applications");
  revalidatePath("/portal/dashboard");
  revalidatePath(`/portal/applications/${applicationId}`);
}

export async function inviteOwnershipRecipientAction(
  applicationId: string,
  targetIdentifier: string,
  reason: string,
) {
  try {
    const ctx = await requireRole(ROLE_CODES.OWNER);
    await OwnershipTransferService.inviteRecipient(ctx, applicationId, targetIdentifier, reason);
    revalidateOwnershipPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Dërgimi i ftesës dështoi",
    };
  }
}

export async function respondOwnershipTransferAction(applicationId: string, accept: boolean) {
  try {
    const ctx = await requireRole(ROLE_CODES.OWNER);
    await OwnershipTransferService.respond(ctx, applicationId, accept);
    revalidateOwnershipPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përgjigjja dështoi",
    };
  }
}

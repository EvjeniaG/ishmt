"use server";

import { revalidatePath } from "next/cache";
import { DelegationRevocationService } from "@/lib/services/delegation-revocation-service";
import { requirePermission, requireRole } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";

function revalidateApplication(applicationId: string) {
  revalidatePath("/portal/applications");
  revalidatePath(`/portal/applications/${applicationId}`);
}

function revalidateElevator(elevatorId: string) {
  revalidatePath("/portal/elevators");
  revalidatePath(`/portal/elevators/${elevatorId}`);
}

export async function revokeInstallerDelegationAction(applicationId: string, reason: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_ASSIGN_INSTALLER);
    await DelegationRevocationService.revokeApplicationInstaller(ctx, applicationId, reason);
    revalidateApplication(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Tërheqja e ftesës dështoi",
    };
  }
}

export async function revokeCertifierDelegationAction(applicationId: string, reason: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_ASSIGN_CERTIFIER);
    await DelegationRevocationService.revokeApplicationCertifier(ctx, applicationId, reason);
    revalidateApplication(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Tërheqja e ftesës dështoi",
    };
  }
}

export async function revokeOwnershipDelegationAction(applicationId: string, reason: string) {
  try {
    const ctx = await requireRole(ROLE_CODES.OWNER);
    await DelegationRevocationService.revokeOwnershipRecipient(ctx, applicationId, reason);
    revalidateApplication(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Tërheqja e ftesës dështoi",
    };
  }
}

export async function revokePendingMaintenanceContractAction(
  contractId: string,
  elevatorId: string,
  reason: string,
) {
  try {
    const ctx = await requireRole(ROLE_CODES.OWNER);
    await DelegationRevocationService.revokePendingMaintenanceContract(ctx, contractId, reason);
    revalidateElevator(elevatorId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Tërheqja e ftesës dështoi",
    };
  }
}

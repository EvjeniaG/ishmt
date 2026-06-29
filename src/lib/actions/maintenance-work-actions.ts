"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/guards";
import { MaintenanceWorkService } from "@/lib/services/maintenance-work-service";

type ActionResult = { success: true } | { success: false; error: string };

function fail(error: unknown): ActionResult {
  return { success: false, error: error instanceof Error ? error.message : "Veprimi dështoi" };
}

export async function acceptMaintenanceContractAction(
  contractId: string,
  documentId: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    await MaintenanceWorkService.acceptContract(ctx, contractId, documentId);
    revalidatePath("/portal/dashboard");
    revalidatePath("/portal/sherbimi/contracts");
    revalidatePath("/portal/omi/kontratat");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function rejectMaintenanceContractAction(
  contractId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    await MaintenanceWorkService.rejectContract(ctx, contractId, reason);
    revalidatePath("/portal/dashboard");
    revalidatePath("/portal/omi/kontratat");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function logInterventionAction(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    const documentId = String(formData.get("documentId") ?? "") || undefined;
    await MaintenanceWorkService.logIntervention(ctx, {
      elevatorId: String(formData.get("elevatorId") ?? ""),
      performedDate: new Date(String(formData.get("performedDate") ?? "")),
      startTime: String(formData.get("startTime") ?? ""),
      endTime: String(formData.get("endTime") ?? ""),
      interventionType: String(formData.get("interventionType") ?? ""),
      description: String(formData.get("description") ?? ""),
      partsReplaced: String(formData.get("partsReplaced") ?? "") || undefined,
      technicianName: String(formData.get("technicianName") ?? ""),
      documentId,
    });
    revalidatePath("/portal/sherbimi/nderhyrje");
    revalidatePath("/portal/elevators");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function submitMonthlyReportAction(input: {
  elevatorId: string;
  periodYear: number;
  periodMonth: number;
  documentId: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    await MaintenanceWorkService.submitMonthlyReport(ctx, input);
    revalidatePath("/portal/sherbimi/raport-mujor");
    revalidatePath("/portal/elevators");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/guards";
import { db } from "@/lib/db";
import { CertifierInspectionService } from "@/lib/services/certifier-inspection-service";
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
    revalidatePath("/portal/sherbimi/contracts");
    revalidatePath("/portal/elevators");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function terminateMaintenanceContractAction(
  contractId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    const contract = await db.maintenanceContract.findFirst({
      where: { id: contractId, maintenanceOrgId: ctx.activeOrgId },
      select: { serviceType: true, elevatorId: true },
    });
    if (!contract) throw new Error("Kontrata nuk u gjet.");

    if (contract.serviceType === "PERIODIC_INSPECTION") {
      await CertifierInspectionService.terminateInspectionContract(ctx, contractId, reason);
    } else {
      await MaintenanceWorkService.terminateActiveContract(ctx, contractId, reason);
    }

    revalidatePath("/portal/dashboard");
    revalidatePath("/portal/sherbimi/contracts");
    revalidatePath("/portal/omi/kontratat-kontrolli");
    revalidatePath("/portal/omi/kontratat");
    revalidatePath("/portal/elevators");
    revalidatePath(`/portal/elevators/${contract.elevatorId}`);
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
  performedDate: string;
  periodYear: number;
  periodMonth: number;
  technicianName: string;
  startTime?: string;
  endTime?: string;
  checklist: Record<string, "ok" | "not_ok" | "na">;
  observations?: string;
  notes?: string;
  documentId?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    await MaintenanceWorkService.submitMonthlyReport(ctx, {
      elevatorId: input.elevatorId,
      performedDate: new Date(input.performedDate),
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      technicianName: input.technicianName,
      startTime: input.startTime,
      endTime: input.endTime,
      checklist: input.checklist,
      observations: input.observations,
      notes: input.notes,
      documentId: input.documentId,
    });
    revalidatePath("/portal/sherbimi/raport-mujor");
    revalidatePath("/portal/elevators");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

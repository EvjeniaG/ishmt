"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/permissions/guards";
import { CertifierInspectionService } from "@/lib/services/certifier-inspection-service";

type ActionResult = { success: true } | { success: false; error: string };

function fail(error: unknown): ActionResult {
  return { success: false, error: error instanceof Error ? error.message : "Veprimi dështoi" };
}

export async function acceptInspectionContractAction(
  contractId: string,
  documentId: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    await CertifierInspectionService.acceptInspectionContract(ctx, contractId, documentId);
    revalidatePath("/portal/omi/inspektim-periodik");
    revalidatePath("/portal/omi/kontratat-kontrolli");
    revalidatePath("/portal/dashboard");
    revalidatePath("/portal/dashboard");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function enrichPeriodicInspectionAction(input: {
  inspectionId: string;
  reportDocumentId: string;
  approvedBodyNumber?: string;
  notes?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    await CertifierInspectionService.enrichPeriodicInspection(ctx, input);
    revalidatePath("/portal/omi/inspektim-periodik");
    revalidatePath("/portal/elevators");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function logPeriodicInspectionAction(input: {
  elevatorId: string;
  conductedDate: string;
  approvedBodyNumber: string;
  examinationType: string;
  result: "PASS" | "FAIL";
  findings?: string;
  reportDocumentId: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requireAuth();
    await CertifierInspectionService.logPeriodicInspection(ctx, {
      elevatorId: input.elevatorId,
      conductedDate: new Date(input.conductedDate),
      approvedBodyNumber: input.approvedBodyNumber,
      examinationType: input.examinationType,
      result: input.result,
      findings: input.findings,
      reportDocumentId: input.reportDocumentId,
    });
    revalidatePath("/portal/omi/inspektim-periodik");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

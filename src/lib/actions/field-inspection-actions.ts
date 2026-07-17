"use server";

import { revalidatePath } from "next/cache";
import { FieldInspectionAssignmentStatus } from "@prisma/client";
import { requireAuth, requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { IshmtFieldInspectionService } from "@/lib/services/ishmt-field-inspection-service";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

function fail(error: unknown): ActionResult<never> {
  return { success: false, error: error instanceof Error ? error.message : "Veprimi dështoi" };
}

export async function assignFieldInspectionAction(input: {
  elevatorId: string;
  assigneeId: string;
  scheduledDate: string;
  instructions?: string;
}): Promise<ActionResult> {
  try {
    const ctx = await requirePermission(PERMISSIONS.INSPECTIONS_FIELD_ASSIGN);
    await IshmtFieldInspectionService.assign(ctx, {
      elevatorId: input.elevatorId,
      assigneeId: input.assigneeId,
      scheduledDate: new Date(input.scheduledDate),
      instructions: input.instructions,
    });
    revalidatePath("/ishmt/field-inspections");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function lookupElevatorForFieldInspectionAction(
  registryNumber: string,
): Promise<
  ActionResult<{
    id: string;
    registryNumber: string;
    buildingAddress: string | null;
    municipality: { nameSq: string } | null;
  } | null>
> {
  try {
    await requirePermission(PERMISSIONS.INSPECTIONS_FIELD_ASSIGN);
    const elevator = await IshmtFieldInspectionService.lookupElevatorByRegistry(registryNumber);
    return { success: true, data: elevator };
  } catch (error) {
    return fail(error);
  }
}

export async function startFieldInspectionAction(assignmentId: string): Promise<ActionResult> {
  try {
    const ctx = await requirePermission(PERMISSIONS.INSPECTIONS_FIELD_CONDUCT);
    await IshmtFieldInspectionService.start(ctx, assignmentId);
    revalidatePath("/ishmt/my-field-inspections");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function completeFieldInspectionAction(
  assignmentId: string,
  input: {
    conductedDate: string;
    result: "PASS" | "FAIL" | "CONDITIONAL";
    findings?: string;
    reportDocumentId?: string;
  },
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission(PERMISSIONS.INSPECTIONS_FIELD_CONDUCT);
    await IshmtFieldInspectionService.complete(ctx, assignmentId, {
      conductedDate: new Date(input.conductedDate),
      result: input.result,
      findings: input.findings,
      reportDocumentId: input.reportDocumentId,
    });
    revalidatePath("/ishmt/my-field-inspections");
    revalidatePath("/ishmt/field-inspections");
    revalidatePath("/ishmt/review");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

export async function cancelFieldInspectionAction(
  assignmentId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const ctx = await requirePermission(PERMISSIONS.INSPECTIONS_FIELD_CANCEL);
    await IshmtFieldInspectionService.cancel(ctx, assignmentId, reason);
    revalidatePath("/ishmt/field-inspections");
    revalidatePath("/ishmt/my-field-inspections");
    return { success: true };
  } catch (error) {
    return fail(error);
  }
}

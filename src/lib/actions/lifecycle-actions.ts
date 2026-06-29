"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { db } from "@/lib/db";
import type { FieldChange } from "@/lib/services/elevator-lifecycle-service";
import { assertAllowedFieldChanges } from "@/lib/lifecycle/editable-fields";

export async function saveUpdateTypeAction(applicationId: string, updateType: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_EDIT_DRAFT);
    const application = await db.application.findFirst({
      where: { id: applicationId, ownerOrgId: ctx.activeOrgId, deletedAt: null },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    await db.applicationData.update({
      where: { applicationId },
      data: { updateType: updateType as never },
    });

    revalidatePath(`/portal/applications/${applicationId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Ruajtja dështoi",
    };
  }
}

export async function saveLifecycleFieldChangesAction(
  applicationId: string,
  mode: "correction" | "update",
  changes: FieldChange[],
  updateType?: string | null,
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_EDIT_DRAFT);
    const application = await db.application.findFirst({
      where: { id: applicationId, ownerOrgId: ctx.activeOrgId, deletedAt: null },
      include: { data: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    assertAllowedFieldChanges(mode, changes, updateType ?? application.data?.updateType);

    await db.applicationData.update({
      where: { applicationId },
      data:
        mode === "correction"
          ? { correctionFields: changes }
          : { updateFields: changes },
    });

    revalidatePath(`/portal/applications/${applicationId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Ruajtja dështoi",
    };
  }
}

export async function saveModernizationDataAction(
  applicationId: string,
  input: { modernizationType: string; modernizationNotes: string },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_EDIT_DRAFT);
    const application = await db.application.findFirst({
      where: { id: applicationId, ownerOrgId: ctx.activeOrgId, deletedAt: null },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    if (!input.modernizationType) throw new Error("Zgjidhni llojin e modernizimit.");
    if (input.modernizationNotes.trim().length < 10) {
      throw new Error("Përshkrimi duhet të ketë të paktën 10 karaktere.");
    }

    await db.applicationData.update({
      where: { applicationId },
      data: {
        modernizationType: input.modernizationType as never,
        modernizationNotes: input.modernizationNotes.trim(),
      },
    });

    revalidatePath(`/portal/applications/${applicationId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Ruajtja dështoi",
    };
  }
}

export async function applyMinorContactChangeAction(
  elevatorId: string,
  input: { phone?: string; email?: string; address?: string },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.ORG_EDIT_OWN);
    const { ElevatorLifecycleService } = await import("@/lib/services/elevator-lifecycle-service");
    await ElevatorLifecycleService.applyMinorContactUpdate(
      ctx.userId,
      elevatorId,
      ctx.activeOrgId,
      input,
    );
    revalidatePath(`/portal/elevators/${elevatorId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përditësimi dështoi",
    };
  }
}

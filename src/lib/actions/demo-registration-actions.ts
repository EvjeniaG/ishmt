"use server";

import { revalidatePath } from "next/cache";
import { ApplicationDemoService } from "@/lib/demo/application-demo-service";
import type { ApplicationDemoStep } from "@/lib/demo/application-demo-steps";
import { requireAuth } from "@/lib/permissions/guards";

function revalidateApplication(applicationId: string) {
  revalidatePath("/portal/applications");
  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath("/ishmt/review");
}

export async function fillApplicationDemoStepAction(
  applicationId: string,
  step: ApplicationDemoStep,
) {
  try {
    ApplicationDemoService.assertEnabled();
    const ctx = await requireAuth();
    const result = await ApplicationDemoService.fillStepFields(ctx, applicationId, step);
    if (result.refreshPage) {
      revalidateApplication(applicationId);
    }
    return {
      success: true as const,
      refreshPage: result.refreshPage ?? false,
      prefilledOrgField: result.prefilledOrgField,
      prefilledOrgId: result.prefilledOrgId,
      prefilledOrgQuery: result.prefilledOrgQuery,
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Plotësimi demo dështoi",
    };
  }
}

/** @deprecated Përdorni fillApplicationDemoStepAction */
export async function fillRegistrationDemoStepAction(
  applicationId: string,
  step: ApplicationDemoStep,
) {
  return fillApplicationDemoStepAction(applicationId, step);
}

"use server";

import { revalidatePath } from "next/cache";
import { ApplicationService } from "@/lib/services/application-service";
import { PostApprovalAssetService } from "@/lib/services/post-approval-asset-service";
import { requirePermission, requireRole, requireAuth, hasPermission, AuthError } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";
import {
  certificationDataSchema,
  locationDataSchema,
  reviewDecisionSchema,
  technicalDataSchema,
} from "@/lib/validations/application";

function revalidateApplicationPaths(id: string) {
  revalidatePath("/portal/applications");
  revalidatePath(`/portal/applications/${id}`);
  revalidatePath("/ishmt/review");
  revalidatePath(`/ishmt/review/${id}`);
}

export async function createApplicationAction() {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_CREATE);
    const application = await ApplicationService.createDraft(ctx);
    revalidatePath("/portal/applications");
    return { success: true as const, applicationId: application.id };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Krijimi dështoi",
    };
  }
}

export async function updateLocationAction(applicationId: string, formData: FormData) {
  const parsed = locationDataSchema.safeParse({
    buildingAddress: formData.get("buildingAddress"),
    municipalityId: formData.get("municipalityId"),
    administrativeUnitId: formData.get("administrativeUnitId") || undefined,
    buildingName: formData.get("buildingName") || undefined,
    gpsLatitude: formData.get("gpsLatitude") || undefined,
    gpsLongitude: formData.get("gpsLongitude") || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_VIEW_OWN);
    await ApplicationService.updateLocationData(ctx, applicationId, parsed.data);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përditësimi dështoi",
    };
  }
}

export async function assignInstallerAction(applicationId: string, formData: FormData) {
  const installerOrgId = String(formData.get("installerOrgId") ?? "");

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_ASSIGN_INSTALLER);
    await ApplicationService.assignInstaller(ctx, applicationId, installerOrgId);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Caktimi dështoi",
    };
  }
}

export async function completeInstallerAction(applicationId: string, formData: FormData) {
  const parsed = technicalDataSchema.safeParse({
    elevatorType: formData.get("elevatorType"),
    manufacturer: formData.get("manufacturer"),
    model: formData.get("model") || undefined,
    serialNumber: formData.get("serialNumber"),
    manufacturingYear: formData.get("manufacturingYear") || undefined,
    capacityKg: formData.get("capacityKg") || undefined,
    capacityPersons: formData.get("capacityPersons") || undefined,
    speedMs: formData.get("speedMs") || undefined,
    floorsServed: formData.get("floorsServed"),
    stops: formData.get("stops") || undefined,
    driveType: formData.get("driveType") || undefined,
    certifierOrgId: formData.get("certifierOrgId") || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  const { certifierOrgId, ...technicalData } = parsed.data;

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_FILL_TECHNICAL);
    await ApplicationService.completeInstallerStep(ctx, applicationId, technicalData, certifierOrgId);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Plotësimi dështoi",
    };
  }
}

export async function completeCertifierAction(applicationId: string, formData: FormData) {
  const parsed = certificationDataSchema.safeParse({
    installationCertificateNumber: formData.get("installationCertificateNumber"),
    installationCertificateDate: formData.get("installationCertificateDate"),
    certifierNotes: formData.get("certifierNotes") || undefined,
    omiNumber: formData.get("omiNumber") || undefined,
    examinationType: formData.get("examinationType") || undefined,
    examinationDate: formData.get("examinationDate") || undefined,
    conformityResult: formData.get("conformityResult") || undefined,
    certificateReference: formData.get("certificateReference") || undefined,
    certifierTechnicalNotes: formData.get("certifierTechnicalNotes") || undefined,
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_UPLOAD_CERTIFICATION);
    await ApplicationService.completeCertifierStep(ctx, applicationId, parsed.data);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Certifikimi dështoi",
    };
  }
}

export async function submitApplicationAction(applicationId: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_SUBMIT);
    await ApplicationService.submitToIshmt(ctx, applicationId);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Parashtrimi dështoi",
    };
  }
}

export async function pickupReviewAction(applicationId: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    await ApplicationService.pickupForReview(ctx, applicationId);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Marrja në shqyrtim dështoi",
    };
  }
}

export async function forwardToAdminAction(
  applicationId: string,
  options?: { requiresPhysicalInspection?: boolean; comment?: string },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    await ApplicationService.forwardToAdmin(ctx, applicationId, options);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Dërgimi te administratori dështoi",
    };
  }
}

export async function recommendRejectionAction(
  applicationId: string,
  input: { reason: string; requiresPhysicalInspection?: boolean },
) {
  if (!input.reason.trim()) {
    return { success: false as const, error: "Arsyeja e rekomandimit është e detyrueshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    await ApplicationService.recommendRejection(ctx, applicationId, input);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Rekomandimi i refuzimit dështoi",
    };
  }
}

export async function approveApplicationAction(
  applicationId: string,
  options?: { requiresPhysicalInspection?: boolean },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_APPROVE);
    const result = await ApplicationService.approve(ctx, applicationId, options);
    revalidateApplicationPaths(applicationId);
    return {
      success: true as const,
      registryNumber: "elevator" in result && result.elevator ? result.elevator.registryNumber : null,
      certificateNumber: "certificate" in result && result.certificate ? result.certificate.certificateNumber : null,
      qrCode: "qr" in result && result.qr ? result.qr.code : null,
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Miratimi dështoi",
    };
  }
}

export async function rejectApplicationAction(applicationId: string, formData: FormData) {
  const parsed = reviewDecisionSchema.safeParse({ reason: formData.get("reason") });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Arsyeja është e detyrueshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_APPROVE);
    await ApplicationService.reject(ctx, applicationId, parsed.data.reason);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Refuzimi dështoi",
    };
  }
}

export async function returnApplicationAction(applicationId: string, formData: FormData) {
  const returnToRoles = formData
    .getAll("returnToRoles")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const parsed = reviewDecisionSchema.safeParse({
    reason: formData.get("reason"),
    returnToRoles,
    requiredCorrection: formData.get("requiredCorrection") || undefined,
  });

  if (!parsed.success || !parsed.data.requiredCorrection) {
    return {
      success: false as const,
      error: parsed.error?.errors[0]?.message ?? "Arsyeja, palët e kthimit dhe korrigjimi i kërkuar janë të detyrueshëm",
    };
  }

  try {
    const ctx = await requireAuth();
    if (
      !hasPermission(ctx, PERMISSIONS.APPLICATIONS_REVIEW) &&
      !hasPermission(ctx, PERMISSIONS.APPLICATIONS_APPROVE)
    ) {
      throw new AuthError("Nuk keni leje për këtë veprim.", 403);
    }
    await ApplicationService.returnForCorrection(ctx, applicationId, {
      reason: parsed.data.reason,
      returnToRoles: parsed.data.returnToRoles,
      requiredCorrection: parsed.data.requiredCorrection,
    });
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Kthimi dështoi",
    };
  }
}

export async function retryAssetGenerationAction(applicationId: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_APPROVE);
    const result = await PostApprovalAssetService.retry({
      applicationId,
      actorId: ctx.userId,
    });
    revalidateApplicationPaths(applicationId);
    return { success: result.success, error: result.success ? undefined : result.error };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Riprovimi dështoi",
    };
  }
}

export async function cancelApplicationAction(applicationId: string) {
  try {
    const ctx = await requireRole(ROLE_CODES.OWNER);
    await ApplicationService.cancel(ctx, applicationId);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Anulimi dështoi",
    };
  }
}

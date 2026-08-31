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
  revalidatePath("/ishmt/chief/inbox");
  revalidatePath("/ishmt/chief/approvals");
  revalidatePath("/ishmt/director/review");
  revalidatePath("/ishmt/my-application-reviews");
  revalidatePath("/ishmt/my-field-inspections");
  revalidatePath("/ishmt/field-inspections");
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

export async function approveInstallerTechnicalReviewAction(applicationId: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_UPLOAD_CERTIFICATION);
    await ApplicationService.approveInstallerTechnicalReview(ctx, applicationId);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Miratimi dështoi",
    };
  }
}

export async function requestInstallerTechnicalCorrectionsAction(
  applicationId: string,
  formData: FormData,
) {
  const notes = String(formData.get("certifierNotes") ?? "").trim();
  if (notes.length < 10) {
    return { success: false as const, error: "Shkruani kërkesat për korrigjim (min 10 karaktere)." };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_UPLOAD_CERTIFICATION);
    await ApplicationService.requestInstallerTechnicalCorrections(ctx, applicationId, notes);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Dërgimi i kërkesave dështoi",
    };
  }
}

export async function resubmitInstallerTechnicalReviewAction(applicationId: string, formData: FormData) {
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
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  const installerResponse = String(formData.get("installerResponse") ?? "").trim();
  if (installerResponse.length < 10) {
    return {
      success: false as const,
      error: "Shkruani përgjigjen ndaj kërkesave të certifikuesit (min 10 karaktere).",
    };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_FILL_TECHNICAL);
    await ApplicationService.resubmitInstallerTechnicalReview(ctx, applicationId, {
      technicalData: parsed.data,
      installerResponse,
    });
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Dërgimi i korrigjimeve dështoi",
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
      error: error instanceof Error ? error.message : "Dërgimi për rregjistrim dështoi",
    };
  }
}

export async function delegateToDirectorAction(
  applicationId: string,
  input: {
    noteText?: string;
    requiredInspectorCount?: number;
    inspectorIds?: string[];
    requiresFieldVerification?: boolean;
  },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_APPROVE);
    await ApplicationService.delegateToDirector(ctx, applicationId, input);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Delegimi te drejtori dështoi",
    };
  }
}

export async function delegateToSectorHeadAction(
  applicationId: string,
  input: { noteText?: string; inspectorIds?: string[]; requiresFieldVerification?: boolean },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    await ApplicationService.delegateToSectorHead(ctx, applicationId, input);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Delegimi te përgjegjësi i sektorit dështoi",
    };
  }
}

export async function assignFieldInspectorsAction(
  applicationId: string,
  input: { inspectorIds?: string[]; noteText?: string; requiresFieldVerification?: boolean },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    await ApplicationService.assignFieldInspectors(ctx, applicationId, input);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Caktimi i inspektorëve dështoi",
    };
  }
}

export async function chiefUpdatePlannedInspectorsAction(
  applicationId: string,
  input: { inspectorIds: string[]; noteText?: string },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_APPROVE);
    await ApplicationService.chiefUpdatePlannedInspectors(ctx, applicationId, input);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Ri-caktimi i inspektorëve dështoi",
    };
  }
}

export async function submitFieldReportAction(
  assignmentId: string,
  reportText: string,
  options?: { submit?: boolean },
) {
  if (options?.submit !== false && !reportText.trim()) {
    return { success: false as const, error: "Raporti i inspektorit është i detyrueshëm" };
  }
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    const result = await ApplicationService.submitFieldReport(ctx, assignmentId, reportText, options);
    revalidatePath("/ishmt/my-application-reviews");
    revalidatePath("/ishmt/review");
    revalidatePath(`/ishmt/review/${result.applicationId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Dorëzimi i raportit dështoi",
    };
  }
}

export async function forwardToDirectorAction(applicationId: string, reportText: string) {
  if (!reportText.trim()) {
    return { success: false as const, error: "Raporti i përgjegjësit të sektorit është i detyrueshëm" };
  }
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    await ApplicationService.forwardToDirectorFromSectorHead(ctx, applicationId, reportText);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Dërgimi te drejtori dështoi",
    };
  }
}

export async function forwardToChiefAction(applicationId: string, reportText: string) {
  if (!reportText.trim()) {
    return { success: false as const, error: "Raporti i drejtorit është i detyrueshëm" };
  }
  try {
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    await ApplicationService.forwardToChiefFromDirector(ctx, applicationId, reportText);
    revalidateApplicationPaths(applicationId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Dërgimi te kryeinspektori dështoi",
    };
  }
}

/** @deprecated */
export async function pickupReviewAction(applicationId: string) {
  return {
    success: false as const,
    error: "Marrja në shqyrtim nga specialisti nuk mbështetet më.",
  };
}

/** @deprecated */
export async function forwardToAdminAction(
  applicationId: string,
  _options?: { requiresPhysicalInspection?: boolean; comment?: string },
) {
  return {
    success: false as const,
    error: "Dërgimi te administratori nuk mbështetet më.",
  };
}

/** @deprecated */
export async function recommendRejectionAction(
  applicationId: string,
  _input: { reason: string; requiresPhysicalInspection?: boolean },
) {
  return {
    success: false as const,
    error: "Rekomandimi i refuzimit nga specialisti nuk mbështetet më.",
  };
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

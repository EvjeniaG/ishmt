"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { CitizenReportStatus, CitizenReportType } from "@prisma/client";
import { CitizenReportService } from "@/lib/services/citizen-report-service";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { citizenReportSchema } from "@/lib/validations/citizen-report";
import { enforcePublicActionRateLimit } from "@/lib/security/rate-limit";

/** Public, unauthenticated submission. */
export async function submitCitizenReportAction(formData: FormData) {
  try {
    await enforcePublicActionRateLimit("citizen-report");
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Shumë kërkesa." };
  }
  const parsed = citizenReportSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description"),
    qrCode: formData.get("qrCode") ?? "",
    locationAddress: formData.get("locationAddress") ?? "",
    reporterName: formData.get("reporterName") ?? "",
    reporterEmail: formData.get("reporterEmail") ?? "",
    reporterPhone: formData.get("reporterPhone") ?? "",
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const hdrs = await headers();
    const report = await CitizenReportService.create({
      type: parsed.data.type as CitizenReportType,
      description: parsed.data.description,
      qrCode: parsed.data.qrCode || null,
      locationAddress: parsed.data.locationAddress || null,
      reporterName: parsed.data.reporterName || null,
      reporterEmail: parsed.data.reporterEmail || null,
      reporterPhone: parsed.data.reporterPhone || null,
      ipAddress: hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip"),
      userAgent: hdrs.get("user-agent"),
    });
    return { success: true as const, reportNumber: report.reportNumber };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Dërgimi i raportit dështoi",
    };
  }
}

export async function assignReportToSelfAction(reportId: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.REPORTS_MANAGE);
    await CitizenReportService.assignToSelf(ctx, reportId);
    revalidatePath("/ishmt/reports");
    revalidatePath(`/ishmt/reports/${reportId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Caktimi dështoi",
    };
  }
}

export async function assignReportInspectorAction(reportId: string, inspectorId: string) {
  if (!reportId || !inspectorId) {
    return { success: false as const, error: "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.REPORTS_MANAGE);
    await CitizenReportService.assignInspector(ctx, reportId, inspectorId);
    revalidatePath("/ishmt/reports");
    revalidatePath(`/ishmt/reports/${reportId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Caktimi i inspektorit dështoi",
    };
  }
}

export async function updateReportStatusAction(formData: FormData) {
  const reportId = String(formData.get("reportId") ?? "");
  const status = String(formData.get("status") ?? "");
  const comment = String(formData.get("comment") ?? "");

  if (!reportId || !(status in CitizenReportStatus)) {
    return { success: false as const, error: "Të dhëna të pavlefshme" };
  }

  try {
    const ctx = await requirePermission(PERMISSIONS.REPORTS_MANAGE);
    await CitizenReportService.updateStatus(
      ctx,
      reportId,
      status as CitizenReportStatus,
      comment || null,
    );
    revalidatePath("/ishmt/reports");
    revalidatePath(`/ishmt/reports/${reportId}`);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Përditësimi dështoi",
    };
  }
}

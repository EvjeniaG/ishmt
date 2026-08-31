"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { CitizenReportStatus, CitizenReportType } from "@prisma/client";
import { CitizenReportService } from "@/lib/services/citizen-report-service";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { citizenReportSchema, formatCitizenReporterName, parseCitizenReportGps } from "@/lib/validations/citizen-report";
import { reverseGeocodeCoordinates } from "@/lib/geo/reverse-geocode";
import { enforcePublicActionRateLimit } from "@/lib/security/rate-limit";

export async function reverseGeocodePlaceAction(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return reverseGeocodeCoordinates(latitude, longitude);
}

/** Public lookup by reference number (rate-limited). */
export async function lookupCitizenReportStatusAction(reportNumber: string) {
  try {
    await enforcePublicActionRateLimit("citizen-report-status", 30);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Shumë kërkesa." };
  }

  const trimmed = reportNumber.trim();
  if (!trimmed) {
    return { success: false as const, error: "Shkruani numrin e referencës së raportit." };
  }

  try {
    const status = await CitizenReportService.getPublicStatusByReportNumber(trimmed);
    if (!status) {
      return {
        success: false as const,
        error: "Nuk u gjet raport me këtë numër reference. Kontrolloni shkrimin (p.sh. RPT-2026-000001).",
      };
    }
    return { success: true as const, status };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Kërkesa dështoi",
    };
  }
}

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
    locationMode: formData.get("locationMode") ?? "text",
    locationAddress: formData.get("locationAddress") ?? "",
    gpsLatitude: formData.get("gpsLatitude") ?? "",
    gpsLongitude: formData.get("gpsLongitude") ?? "",
    reporterFirstName: formData.get("reporterFirstName") ?? "",
    reporterLastName: formData.get("reporterLastName") ?? "",
    reporterEmail: formData.get("reporterEmail") ?? "",
    reporterPhone: formData.get("reporterPhone") ?? "",
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Të dhëna të pavlefshme" };
  }

  try {
    const hdrs = await headers();
    const gps =
      parsed.data.locationMode === "gps" ? parseCitizenReportGps(parsed.data) : null;

    let locationAddress =
      parsed.data.locationMode === "text" ? parsed.data.locationAddress?.trim() || null : null;

    if (parsed.data.locationMode === "gps") {
      locationAddress = parsed.data.locationAddress?.trim() || null;
      if (!locationAddress && gps) {
        locationAddress = await reverseGeocodeCoordinates(gps.latitude, gps.longitude);
      }
    }

    const report = await CitizenReportService.create({
      type: parsed.data.type as CitizenReportType,
      description: parsed.data.description,
      qrCode: parsed.data.qrCode || null,
      locationAddress,
      gpsLatitude: gps?.latitude ?? null,
      gpsLongitude: gps?.longitude ?? null,
      reporterName: formatCitizenReporterName(
        parsed.data.reporterFirstName,
        parsed.data.reporterLastName,
      ),
      reporterEmail: parsed.data.reporterEmail || null,
      reporterPhone: parsed.data.reporterPhone,
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

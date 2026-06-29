import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { buildCsv } from "@/lib/reports/csv-builder";
import { isReportAllowed, type ReportId } from "@/lib/reports/report-catalog";
import { ReportExportService } from "@/lib/services/report-export-service";
import { PdfService } from "@/lib/services/pdf-service";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requirePermission(PERMISSIONS.REPORTS_EXPORT);
    const params = request.nextUrl.searchParams;
    const report = params.get("report");
    const format = params.get("format") ?? "csv";

    if (!report || !isReportAllowed(ctx, report)) {
      return NextResponse.json({ error: "Raporti nuk lejohet ose mungon." }, { status: 403 });
    }

    if (format !== "csv" && format !== "pdf") {
      return NextResponse.json({ error: "Formati duhet të jetë csv ose pdf." }, { status: 400 });
    }

    const filters: Record<string, string | undefined> = {};
    for (const [key, value] of params.entries()) {
      if (key === "report" || key === "format") continue;
      filters[key] = value || undefined;
    }

    const payload = await ReportExportService.build(ctx, report as ReportId, filters);
    const today = new Date().toISOString().slice(0, 10);
    const safeBase = payload.filenameBase.replace(/[^\w-]+/g, "-");

    if (format === "csv") {
      const csv = buildCsv(payload.columns, payload.rows);
      const filename = `${safeBase}-${today}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const pdfRows = payload.rows.map((row) =>
      payload.columns.map((col) => String(row[col.key] ?? "")),
    );
    const pdf = await PdfService.generateTabularReportPdf({
      title: payload.title,
      subtitle: `Gjeneruar më ${today} · ${payload.rows.length} rreshta`,
      columns: payload.columns.map((c) => ({ label: c.label })),
      rows: pdfRows,
    });
    const filename = `${safeBase}-${today}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eksporti dështoi.";
    const status = message.toLowerCase().includes("leje") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

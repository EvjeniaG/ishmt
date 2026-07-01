import { NextRequest, NextResponse } from "next/server";
import { parseContractIssueFilters } from "@/lib/ishmt/contract-issue-filters";
import { requireAuth } from "@/lib/permissions/guards";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import { IshmtContractExportService } from "@/lib/services/ishmt-contract-export-service";
import {
  CONTRACT_ISSUES_EXPORT_MAX,
  IshmtContractMonitorService,
} from "@/lib/services/ishmt-contract-monitor-service";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    if (!isIshmtStaffRole(ctx.roleCode)) {
      return NextResponse.json({ error: "Nuk keni leje." }, { status: 403 });
    }

    const params: Record<string, string | undefined> = {};
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      params[key] = value;
    }

    const filters = parseContractIssueFilters(params);
    const rows = await IshmtContractMonitorService.listAllFilteredIssues(filters);
    const workbook = IshmtContractExportService.buildWorkbook(rows);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `Alarmet-kontratash-${today}.xlsx`;
    const truncated = rows.length >= CONTRACT_ISSUES_EXPORT_MAX;

    return new NextResponse(new Uint8Array(workbook), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        ...(truncated ? { "X-Export-Truncated": "true" } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eksporti dështoi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

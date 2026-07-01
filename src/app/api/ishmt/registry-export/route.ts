import { NextRequest, NextResponse } from "next/server";
import { ComplianceIndicator, ElevatorStatus } from "@prisma/client";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { NationalRegistryExportService } from "@/lib/services/national-registry-export-service";
import type { ComplianceGapFilter } from "@/lib/services/ishmt-search-service";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireAuthForPage();
    if (!isIshmtStaffRole(ctx.roleCode)) {
      return NextResponse.json({ error: "Nuk keni leje." }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const filters = {
      query: sp.get("q") ?? undefined,
      status: (sp.get("status") as ElevatorStatus) || undefined,
      compliance: (sp.get("compliance") as ComplianceIndicator) || undefined,
      municipalityId: sp.get("municipalityId") ?? undefined,
      ownerNipt: sp.get("ownerNipt") ?? undefined,
      missingQrPlacement: sp.get("missingQrPlacement") === "1",
      complianceGap: (sp.get("complianceGap") as ComplianceGapFilter) || undefined,
    };

    const { buffer, rowCount } = await NationalRegistryExportService.buildFilteredWorkbook(ctx, filters);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `Regjistri-ISHMT-${today}-${rowCount}-ashensore.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eksporti dështoi";
    const status = message.includes("leje") || message.includes("Nuk keni") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

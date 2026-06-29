import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions/guards";
import { MaintenanceAssignmentService } from "@/lib/services/maintenance-assignment-service";
import { QkbLookupService } from "@/lib/services/qkb-lookup-service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const query = request.nextUrl.searchParams.get("query")?.trim();
    if (!query) {
      return NextResponse.json({ error: "Kërkimi mungon." }, { status: 400 });
    }

    const isNipt = QkbLookupService.isValidNiptFormat(query);
    const company = isNipt ? await MaintenanceAssignmentService.lookupCompanyByNipt(query) : null;
    const companies = await MaintenanceAssignmentService.findMaintenanceCompaniesByName(query);
    const selectable = Boolean(company?.selectable) || companies.some((c) => c.selectable);

    return NextResponse.json({
      company,
      companies,
      selectable,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kontrolli QKB dështoi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

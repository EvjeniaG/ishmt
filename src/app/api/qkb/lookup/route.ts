import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/permissions/guards";
import { InstallerAssignmentService } from "@/lib/services/installer-assignment-service";
import { CertifierAssignmentService } from "@/lib/services/certifier-assignment-service";
import { MaintenanceAssignmentService } from "@/lib/services/maintenance-assignment-service";
import { QkbLookupService } from "@/lib/services/qkb-lookup-service";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const query = request.nextUrl.searchParams.get("query")?.trim();
    if (!query) {
      return NextResponse.json({ error: "Kërkimi mungon." }, { status: 400 });
    }

    const scope = request.nextUrl.searchParams.get("scope") ?? "maintenance";
    const isNipt = QkbLookupService.isValidNiptFormat(query);

    if (scope === "installer") {
      const excludeOrgId = request.nextUrl.searchParams.get("excludeOrgId");
      const company = isNipt
        ? await InstallerAssignmentService.lookupCompanyByNipt(query, { excludeOrgId })
        : null;
      const companies = await InstallerAssignmentService.findInstallerCompaniesByName(query, {
        excludeOrgId,
      });
      const selectable = Boolean(company?.selectable) || companies.some((c) => c.selectable);

      return NextResponse.json({
        company,
        companies,
        selectable,
      });
    }

    if (scope === "certifier") {
      const excludeOrgId = request.nextUrl.searchParams.get("excludeOrgId");
      const company = isNipt
        ? await CertifierAssignmentService.lookupCompanyByNipt(query, { excludeOrgId })
        : null;
      const companies = await CertifierAssignmentService.findCertifierCompaniesByName(query, {
        excludeOrgId,
      });
      const selectable = Boolean(company?.selectable) || companies.some((c) => c.selectable);

      return NextResponse.json({
        company,
        companies,
        selectable,
      });
    }

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

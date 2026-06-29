import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { RegisterExportService } from "@/lib/services/register-export-service";

export async function GET(_request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.APPLICATIONS_VIEW_ALL);

    const buffer = await RegisterExportService.buildWorkbook();
    const today = new Date().toISOString().slice(0, 10);
    const filename = `Regjistri-Ashensoreve-${today}.xlsx`;

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
    const message = error instanceof Error ? error.message : "Eksporti i regjistrit dështoi";
    const status = message.includes("leje") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

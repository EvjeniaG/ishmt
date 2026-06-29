import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@/lib/services/document-service";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { buildContentDisposition } from "@/lib/documents/content-disposition";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.DOCUMENTS_DOWNLOAD);
    const { id } = await params;

    const { doc, body, contentType } = await DocumentService.downloadWithAccessLog(ctx, id);

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": buildContentDisposition("attachment", doc.originalFilename),
        "Content-Length": String(body.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shkarkimi dështoi";
    const status = message.includes("leje") ? 403 : message.includes("gjet") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

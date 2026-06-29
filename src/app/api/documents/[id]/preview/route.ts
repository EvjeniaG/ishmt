import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@/lib/services/document-service";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import {
  buildContentDisposition,
  resolvePreviewContentType,
} from "@/lib/documents/content-disposition";

/** Serves a document for in-browser preview (inline, never attachment). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.DOCUMENTS_DOWNLOAD);
    const { id } = await params;

    const { doc, body, contentType } = await DocumentService.downloadWithAccessLog(ctx, id);
    const previewType = resolvePreviewContentType(contentType, doc.originalFilename);

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": previewType,
        "Content-Disposition": buildContentDisposition("inline", doc.originalFilename),
        "Content-Length": String(body.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parashikimi dështoi";
    const status = message.includes("leje") ? 403 : message.includes("gjet") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

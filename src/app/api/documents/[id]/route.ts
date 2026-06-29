import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@/lib/services/document-service";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requirePermission(PERMISSIONS.DOCUMENTS_UPLOAD);
    const { id } = await params;

    await DocumentService.softDelete(ctx, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Heqja e dokumentit dështoi";
    const status = message.includes("leje") || message.includes("Vetëm")
      ? 403
      : message.includes("gjet")
        ? 404
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

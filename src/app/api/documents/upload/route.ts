import { DocumentClassification } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@/lib/services/document-service";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePermission(PERMISSIONS.DOCUMENTS_UPLOAD);
    const formData = await request.formData();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Skedari mungon." }, { status: 400 });
    }

    const entityType = String(formData.get("entityType") ?? "");
    const entityId = String(formData.get("entityId") ?? "");
    const classificationRaw = String(formData.get("classification") ?? "APPLICATION");
    const purpose = String(formData.get("purpose") ?? "") || undefined;

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "Lidhja e dokumentit është e pavlefshme." }, { status: 400 });
    }

    const classification =
      classificationRaw in DocumentClassification
        ? DocumentClassification[classificationRaw as keyof typeof DocumentClassification]
        : DocumentClassification.APPLICATION;

    const buffer = Buffer.from(await file.arrayBuffer());

    const document = await DocumentService.uploadAndLink(ctx, {
      buffer,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      classification,
      entityType,
      entityId,
      purpose,
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      filename: document.originalFilename,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ngarkimi dështoi";
    const status = message.includes("leje") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

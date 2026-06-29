"use server";

import { revalidatePath } from "next/cache";
import { DocumentService } from "@/lib/services/document-service";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";

/** @deprecated Use POST /api/documents/upload for file uploads */
export async function logDocumentDownloadAction(documentId: string) {
  try {
    const ctx = await requirePermission(PERMISSIONS.DOCUMENTS_DOWNLOAD);
    await DocumentService.downloadWithAccessLog(ctx, documentId);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Shkarkimi dështoi",
    };
  }
}

export async function revalidateApplicationDocumentsAction(applicationId: string) {
  revalidatePath(`/portal/applications/${applicationId}`);
  revalidatePath(`/ishmt/review/${applicationId}`);
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PostApprovalAssetService } from "@/lib/services/post-approval-asset-service";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";

/**
 * POST /api/admin/elevators/[id]/regenerate-assets
 * 
 * Regenerates missing QR codes and certificates for an elevator.
 * Requires ISHMT_ADMIN or equivalent permission.
 * 
 * Response: { success: true, assets: { certificateDocumentId, qrImageDocumentId, ... } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify admin permission
    const ctx = await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    
    // Fetch elevator with related data
    const elevator = await db.elevator.findFirst({
      where: { id, deletedAt: null },
      include: {
        certificates: { where: { type: "REGISTRATION", status: "ACTIVE" }, take: 1 },
        qrCodes: { where: { isActive: true }, take: 1 },
        originatingApplication: true,
      },
    });

    if (!elevator) {
      return NextResponse.json(
        { error: "Ashensori nuk u gjet." },
        { status: 404 }
      );
    }

    const certificate = elevator.certificates[0];
    const qr = elevator.qrCodes[0];

    if (!certificate || !qr) {
      return NextResponse.json(
        { error: "Ashensori nuk ka certifikatë ose kod QR për t'u rigjeneruar." },
        { status: 400 }
      );
    }

    if (!elevator.originatingApplication) {
      return NextResponse.json(
        { error: "Nuk u gjet aplikimi i origjinës për këtë ashensor." },
        { status: 400 }
      );
    }

    // Trigger asset generation
    const result = await PostApprovalAssetService.tryGenerate({
      elevatorId: elevator.id,
      certificateId: certificate.id,
      qrCodeId: qr.id,
      applicationId: elevator.originatingApplication.id,
      actorId: ctx.userId,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Aktivet rigjeneruar me sukses",
      assets: result.assets,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rigjenerimi dështoi";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

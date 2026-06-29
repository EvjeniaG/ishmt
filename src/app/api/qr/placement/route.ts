import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { QrService } from "@/lib/services/qr-service";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";

export async function POST(request: NextRequest) {
  try {
    const ctx = await requirePermission(PERMISSIONS.ELEVATORS_VIEW_OWN);
    const body = await request.json();
    const qrCodeId = String(body.qrCodeId ?? "");
    const documentId = String(body.documentId ?? "");

    if (!qrCodeId || !documentId) {
      return NextResponse.json({ error: "Të dhëna të pavlefshme." }, { status: 400 });
    }

    const qr = await db.qrCode.findUnique({
      where: { id: qrCodeId },
      include: { elevator: true },
    });

    if (!qr || qr.elevator.ownerOrgId !== ctx.activeOrgId) {
      return NextResponse.json({ error: "Nuk keni leje." }, { status: 403 });
    }

    // Ensure the referenced document was actually uploaded by this user (prevents
    // attaching another user's document as the placement photo).
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: { uploadedById: true },
    });
    if (!document || document.uploadedById !== ctx.userId) {
      return NextResponse.json({ error: "Dokumenti nuk është i vlefshëm." }, { status: 403 });
    }

    await QrService.confirmPlacement(qrCodeId, documentId, ctx.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Konfirmimi dështoi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { QrService } from "@/lib/services/qr-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const normalized = code.toUpperCase();

    const qr = await db.qrCode.findFirst({
      where: { code: normalized, isActive: true },
    });

    if (!qr) {
      return NextResponse.json({ error: "Kodi QR nuk u gjet." }, { status: 404 });
    }

    const buffer = await QrService.generateQrImageBuffer(normalized);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Imazhi QR nuk u gjet." }, { status: 404 });
  }
}

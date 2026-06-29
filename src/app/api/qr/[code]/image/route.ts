import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { StorageService } from "@/lib/storage/storage-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const qr = await db.qrCode.findFirst({
      where: { code: code.toUpperCase(), isActive: true },
      include: { imageDocument: true },
    });

    if (!qr?.imageDocument || qr.imageDocument.deletedAt) {
      return NextResponse.json({ error: "Imazhi QR nuk u gjet." }, { status: 404 });
    }

    const file = await StorageService.download(qr.imageDocument.storagePath);

    return new NextResponse(new Uint8Array(file.body), {
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

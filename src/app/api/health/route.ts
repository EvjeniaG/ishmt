import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ishmtt-elevator-registry",
    phase: "1-scaffolding",
    timestamp: new Date().toISOString(),
  });
}

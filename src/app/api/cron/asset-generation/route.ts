import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/verify-cron-secret";
import { executeAssetGenerationRetryJobWithLogging } from "@/lib/jobs/asset-generation-job";

export const maxDuration = 60;

/** Riprovon gjenerimin e PDF certifikatës + QR për aplikime të miratuara. */
export async function GET(request: NextRequest) {
  const unauthorized = verifyCronSecret(request);
  if (unauthorized) return unauthorized;

  const result = await executeAssetGenerationRetryJobWithLogging();
  return NextResponse.json({ success: true, result, timestamp: new Date().toISOString() });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

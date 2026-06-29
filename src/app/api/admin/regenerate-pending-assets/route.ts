import { NextRequest, NextResponse } from "next/server";
import { runAssetGenerationRetryJob } from "@/lib/jobs/asset-generation-job";
import { requirePermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";

/**
 * Legacy admin endpoint for asset regeneration.
 * Prefer POST /api/cron/jobs with { "jobs": ["ASSET_GENERATION_RETRY"] }.
 *
 * Access requires EITHER a valid CRON_SECRET bearer token (machine callers) OR an
 * authenticated session with the asset-review permission. Fails closed in all
 * environments - there is no header-based bypass.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const hasValidCronSecret = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;

  if (!hasValidCronSecret) {
    try {
      await requirePermission(PERMISSIONS.APPLICATIONS_REVIEW);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runAssetGenerationRetryJob();
    return NextResponse.json({
      success: true,
      message: "Asset regeneration completed",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}

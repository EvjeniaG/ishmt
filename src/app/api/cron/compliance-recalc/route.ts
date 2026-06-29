import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/verify-cron-secret";
import { runScheduledJobs } from "@/lib/jobs/job-runner";

/** @deprecated Prefer POST /api/cron/jobs with `{ "jobs": ["COMPLIANCE_RECALC"] }` */
export async function POST(request: NextRequest) {
  const unauthorized = verifyCronSecret(request);
  if (unauthorized) return unauthorized;

  const results = await runScheduledJobs(["COMPLIANCE_RECALC"]);
  return NextResponse.json({ ok: true, ...((results.COMPLIANCE_RECALC as object) ?? {}) });
}

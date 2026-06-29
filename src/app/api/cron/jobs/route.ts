import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/verify-cron-secret";
import { runScheduledJobs } from "@/lib/jobs/job-runner";

/** Single cron entrypoint - pass `{ "jobs": ["COMPLIANCE_RECALC"] }` or run all when omitted. */
export async function POST(request: NextRequest) {
  const unauthorized = verifyCronSecret(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => ({}));
  const jobTypes = Array.isArray(body?.jobs) ? (body.jobs as string[]) : undefined;

  const results = await runScheduledJobs(jobTypes);

  return NextResponse.json({ success: true, results, timestamp: new Date().toISOString() });
}

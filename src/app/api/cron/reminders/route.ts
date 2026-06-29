import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/verify-cron-secret";
import { runScheduledJobs } from "@/lib/jobs/job-runner";

/** @deprecated Prefer POST /api/cron/jobs with `{ "jobs": ["REMINDERS"] }` */
export async function POST(request: NextRequest) {
  const unauthorized = verifyCronSecret(request);
  if (unauthorized) return unauthorized;

  try {
    const results = await runScheduledJobs(["REMINDERS"]);
    return NextResponse.json({ ok: true, ...(results.REMINDERS as object) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron dështoi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

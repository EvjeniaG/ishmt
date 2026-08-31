import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/verify-cron-secret";
import { runScheduledJobs } from "@/lib/jobs/job-runner";

/** Cron mund të zgjasë (PDF, njoftime). */
export const maxDuration = 60;

async function handleCron(request: NextRequest) {
  const unauthorized = verifyCronSecret(request);
  if (unauthorized) return unauthorized;

  let jobTypes: string[] | undefined;

  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    jobTypes = Array.isArray(body?.jobs) ? (body.jobs as string[]) : undefined;
  } else {
    const jobsParam = request.nextUrl.searchParams.get("jobs");
    if (jobsParam) {
      jobTypes = jobsParam.split(",").map((j) => j.trim()).filter(Boolean);
    }
  }

  const results = await runScheduledJobs(jobTypes);

  return NextResponse.json({ success: true, results, timestamp: new Date().toISOString() });
}

/** Vercel Cron thërret GET; manual/test me POST + body `{ "jobs": [...] }`. */
export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

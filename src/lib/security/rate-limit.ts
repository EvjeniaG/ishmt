import { headers } from "next/headers";

/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Note: state is per-process. In a multi-instance deployment this throttles per
 * instance, which still meaningfully slows brute-force/enumeration. For strict
 * global limits, back this with Redis using the same interface.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map does not grow unbounded.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterMs: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

/** Best-effort client IP from proxy headers (falls back to a constant bucket). */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    return h.get("x-real-ip") ?? "unknown";
  } catch {
    return "unknown";
  }
}

const PUBLIC_PER_MINUTE = Number(process.env.RATE_LIMIT_PUBLIC_PER_MINUTE ?? "60");
const LOGIN_PER_MINUTE = Number(process.env.RATE_LIMIT_LOGIN_PER_MINUTE ?? "10");

/**
 * Throttles a sensitive public action by client IP. Throws a user-facing error
 * (in Albanian) when the limit is exceeded.
 */
export async function enforcePublicActionRateLimit(action: string, perMinute = PUBLIC_PER_MINUTE) {
  const ip = await getClientIp();
  const result = rateLimit(`${action}:${ip}`, perMinute, 60_000);
  if (!result.allowed) {
    const seconds = Math.ceil(result.retryAfterMs / 1000);
    throw new Error(`Shumë kërkesa. Provoni sërish pas ${seconds} sekondash.`);
  }
}

export const RATE_LIMITS = {
  PUBLIC_PER_MINUTE,
  LOGIN_PER_MINUTE,
  AUTH_SENSITIVE_PER_MINUTE: 5,
};

import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 5000;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function prune(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  prune(now);

  const key = `${scope}:${getClientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  bucket.count += 1;
  return null;
}

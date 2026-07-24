/**
 * In-memory rate limiting — SPEC §15.3 / §22.5.
 *
 * "20 AI requests per IP per hour, in-memory LRU. Returns a friendly message on
 * exceed. Sufficient for MVP scale; a durable store is a future improvement and
 * is named as such."
 *
 * HONEST LIMITATION: this counter lives in one server instance's memory. On
 * Vercel it resets on cold start and is not shared across regions or isolates,
 * so it is a courtesy limit, not a security control. The README's Limitations
 * section must say so.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Epoch ms when the current window expires. */
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** Bound the map so a flood of unique IPs cannot grow it without limit. */
const MAX_TRACKED_KEYS = 5_000;

const buckets = new Map<string, Bucket>();

function evictIfNeeded(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  // Drop expired entries first; if still full, drop the oldest inserted (Map
  // preserves insertion order, so the first key is the least recently added).
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_TRACKED_KEYS) {
    const oldest = buckets.keys().next();
    if (oldest.done) break;
    buckets.delete(oldest.value);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  evictIfNeeded(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Test-only helper so suites do not leak state into one another. */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

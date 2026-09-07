import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting — Upstash Redis when configured, in-process token bucket
 * otherwise. Same mock/live switch pattern as auth and payments: set
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN and limits become
 * global across serverless instances. Without Redis, production uses an atomic
 * PostgreSQL bucket; local/demo tests use bounded process memory.
 *
 * Sensitive limits fail closed when their configured shared store is unavailable.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface LimiterOptions {
  capacity: number;
  refillRate: number; // tokens added per second
}

const DEFAULT_LIMITS: LimiterOptions = { capacity: 30, refillRate: 10 };
const STRICT_LIMITS: LimiterOptions = { capacity: 10, refillRate: 2 };

// --- Upstash (live) ---------------------------------------------------------

const upstashEnabled = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

function makeUpstashLimiter(opts: LimiterOptions, scope: string) {
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.tokenBucket(opts.refillRate, "1 s", opts.capacity),
    prefix: `bids:rl:${scope}`,
  });
}

const upstashDefault = upstashEnabled
  ? makeUpstashLimiter(DEFAULT_LIMITS, "default")
  : null;
const upstashStrict = upstashEnabled
  ? makeUpstashLimiter(STRICT_LIMITS, "strict")
  : null;

let warnedFallback = false;
function warnFallbackOnce() {
  if (warnedFallback || process.env.NODE_ENV !== "production") return;
  warnedFallback = true;
  console.warn(
    "[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to per-instance limits.",
  );
}

// --- In-memory fallback ------------------------------------------------------

const store = new Map<string, Bucket>();
const MAX_LOCAL_BUCKETS = 10_000;

function refill(bucket: Bucket, capacity: number, refillRate: number) {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;
}

function localRateLimit(
  key: string,
  cost: number,
  opts: LimiterOptions,
): { ok: boolean } {
  let bucket = store.get(key);
  if (!bucket) {
    if (store.size >= MAX_LOCAL_BUCKETS) {
      const cutoff = Date.now() - 60_000;
      for (const [id, entry] of store)
        if (entry.lastRefill < cutoff) store.delete(id);
      if (store.size >= MAX_LOCAL_BUCKETS) return { ok: false };
    }
    bucket = { tokens: opts.capacity, lastRefill: Date.now() };
    store.set(key, bucket);
  }

  refill(bucket, opts.capacity, opts.refillRate);

  if (bucket.tokens < cost) {
    return { ok: false };
  }
  bucket.tokens -= cost;
  return { ok: true };
}

// --- Public API ---------------------------------------------------------------

/**
 * Attempt to consume `cost` tokens from the bucket for `key`.
 * Resolves `{ ok: true }` when allowed, `{ ok: false }` when rate-limited.
 * Fails open on Redis errors — an outage at the limiter must not take the
 * API down with it.
 */
export async function rateLimit(
  key: string,
  cost = 1,
  opts: LimiterOptions = DEFAULT_LIMITS,
): Promise<{ ok: boolean }> {
  if (upstashDefault) {
    try {
      const res = await upstashDefault.limit(key, { rate: cost });
      return { ok: res.success };
    } catch (err) {
      console.error("[ratelimit] Upstash error — failing open", err);
      return { ok: true };
    }
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_BIDS_PAYMENT_MODE !== "demo"
  ) {
    try {
      const { databaseRateLimit } = await import("./database-rate-limit");
      return await databaseRateLimit(
        `default:${key}`,
        cost,
        opts.capacity,
        opts.refillRate,
      );
    } catch {
      console.error("[ratelimit] Database unavailable; allowing public read.");
      return { ok: true };
    }
  }
  warnFallbackOnce();
  return localRateLimit(`default:${key}`, cost, opts);
}

/**
 * Stricter limiter for sensitive mutation endpoints.
 * 10 requests burst / 2 per second sustained.
 */
export async function strictRateLimit(key: string): Promise<{ ok: boolean }> {
  if (upstashStrict) {
    try {
      const res = await upstashStrict.limit(key);
      return { ok: res.success };
    } catch (err) {
      console.error(
        "[ratelimit] Upstash error — rejecting sensitive mutation",
        err,
      );
      return { ok: false };
    }
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_BIDS_PAYMENT_MODE !== "demo"
  ) {
    try {
      const { databaseRateLimit } = await import("./database-rate-limit");
      return await databaseRateLimit(
        `strict:${key}`,
        1,
        STRICT_LIMITS.capacity,
        STRICT_LIMITS.refillRate,
      );
    } catch {
      console.error(
        "[ratelimit] Database unavailable; rejecting sensitive mutation.",
      );
      return { ok: false };
    }
  }
  warnFallbackOnce();
  return localRateLimit(`strict:${key}`, 1, STRICT_LIMITS);
}

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting — Upstash Redis when configured, in-process token bucket
 * otherwise. Same mock/live switch pattern as auth and payments: set
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN and limits become
 * global across serverless instances; leave them unset and the in-memory
 * fallback keeps local dev and CI dependency-free.
 *
 * The fallback is per-instance only — on a multi-replica deployment it
 * under-counts, which is why production should always set the env vars.
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

function makeUpstashLimiter(opts: LimiterOptions) {
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.tokenBucket(opts.refillRate, "1 s", opts.capacity),
    prefix: "bids:rl",
  });
}

const upstashDefault = upstashEnabled ? makeUpstashLimiter(DEFAULT_LIMITS) : null;
const upstashStrict = upstashEnabled ? makeUpstashLimiter(STRICT_LIMITS) : null;

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

function refill(bucket: Bucket, capacity: number, refillRate: number) {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;
}

function localRateLimit(key: string, cost: number, opts: LimiterOptions): { ok: boolean } {
  let bucket = store.get(key);
  if (!bucket) {
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
  warnFallbackOnce();
  return localRateLimit(key, cost, opts);
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
      console.error("[ratelimit] Upstash error — failing open", err);
      return { ok: true };
    }
  }
  warnFallbackOnce();
  return localRateLimit(key, 1, STRICT_LIMITS);
}

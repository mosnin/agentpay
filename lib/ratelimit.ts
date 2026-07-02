/**
 * In-process token-bucket rate limiter — no Redis required for the MVP.
 * Each "bucket" is keyed by an identifier (IP, user ID, etc.).
 * Buckets drain at `refillRate` tokens/second and hold up to `capacity`.
 *
 * NOTE: This is per-instance only. In a multi-replica deployment swap this
 * out for Upstash Ratelimit or a Redis-backed solution.
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface LimiterOptions {
  capacity: number;
  refillRate: number; // tokens added per second
}

const DEFAULT_CAPACITY = 30;
const DEFAULT_REFILL_RATE = 10; // 10 req/s sustained

const store = new Map<string, Bucket>();

function refill(bucket: Bucket, capacity: number, refillRate: number) {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;
}

/**
 * Attempt to consume `cost` tokens from the bucket for `key`.
 * Returns `{ ok: true }` when allowed, `{ ok: false }` when rate-limited.
 */
export function rateLimit(
  key: string,
  cost = 1,
  opts: LimiterOptions = { capacity: DEFAULT_CAPACITY, refillRate: DEFAULT_REFILL_RATE },
): { ok: boolean } {
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

/**
 * Stricter limiter for sensitive mutation endpoints.
 * 10 requests burst / 2 per second sustained.
 */
export function strictRateLimit(key: string): { ok: boolean } {
  return rateLimit(key, 1, { capacity: 10, refillRate: 2 });
}

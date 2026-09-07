import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ limit: vi.fn(), constructor: vi.fn() }));
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static tokenBucket() {
      return {};
    }
    constructor(options: unknown) {
      mocks.constructor(options);
    }
    limit = mocks.limit;
  },
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetModules();
});
async function limiter() {
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "fixture");
  return import("@/lib/ratelimit");
}
it("isolates strict buckets from ordinary API traffic", async () => {
  await limiter();
  expect(
    mocks.constructor.mock.calls.map(([options]) => options.prefix),
  ).toEqual(["bids:rl:default", "bids:rl:strict"]);
});
it("fails closed for sensitive mutations when Redis is unavailable", async () => {
  const { strictRateLimit } = await limiter();
  mocks.limit.mockRejectedValue(Error("Redis unavailable"));
  expect(await strictRateLimit("funding:user-1")).toEqual({ ok: false });
});
it("allows a sensitive mutation only when the shared limiter allows it", async () => {
  const { strictRateLimit } = await limiter();
  mocks.limit
    .mockResolvedValueOnce({ success: false })
    .mockResolvedValueOnce({ success: true });
  expect(await strictRateLimit("funding:user-1")).toEqual({ ok: false });
  expect(await strictRateLimit("funding:user-1")).toEqual({ ok: true });
});

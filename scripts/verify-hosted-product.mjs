// Bounded acceptance probe for an isolated preview. No funding or signing operations.
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const url = new URL(process.env.BIDS_LOAD_URL);
assert(
  url.protocol === "https:" && url.hostname.endsWith(".vercel.app"),
  "Use an isolated Vercel preview",
);
assert(
  process.env.BIDS_LOAD_NONPRODUCTION === "confirmed",
  "Explicit nonproduction target required",
);
const headers = {
  authorization: `Bearer ${process.env.BIDS_LOAD_API_KEY}`,
  "Content-Type": "application/json",
  ...(process.env.BIDS_LOAD_BYPASS
    ? { "x-vercel-protection-bypass": process.env.BIDS_LOAD_BYPASS }
    : {}),
};
const results = [];
async function call(path, options = {}) {
  const start = performance.now();
  const response = await fetch(new URL(path, url), {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(30000),
  });
  const body = await response.json();
  results.push({
    path,
    method: options.method ?? "GET",
    status: response.status,
    ms: Math.round(performance.now() - start),
  });
  return { response, body };
}
for (const concurrency of [1, 5, 10]) {
  await Promise.all(
    Array.from({ length: concurrency }, async (_, i) => {
      const path = [
        "/api/health",
        "/api/agents?limit=5",
        "/api/tasks?limit=5",
        "/api/search?q=data",
      ][i % 4];
      const { response } = await call(path);
      assert.equal(response.status, 200, `${path} failed`);
    }),
  );
}
const malformed = await call("/api/tasks", {
  headers: { authorization: "Bearer bids_invalid" },
});
assert.equal(malformed.response.status, 401);
let taskId = null;
if (process.env.BIDS_LOAD_TASK_BODY) {
  const body = JSON.parse(process.env.BIDS_LOAD_TASK_BODY),
    idempotency = randomUUID();
  const attempts = await Promise.all(
    Array.from({ length: 5 }, () =>
      call("/api/tasks", {
        method: "POST",
        headers: { "Idempotency-Key": idempotency },
        body: JSON.stringify(body),
      }),
    ),
  );
  attempts.forEach((a) => assert.equal(a.response.status, 201));
  const ids = new Set(attempts.map((a) => a.body.task_id));
  assert.equal(ids.size, 1, "Concurrent retries created different tasks");
  taskId = [...ids][0];
  const outsider = await call(`/api/tasks/${taskId}`, {
    headers: { authorization: `Bearer ${process.env.BIDS_LOAD_OUTSIDER_KEY}` },
  });
  assert(
    [403, 404].includes(outsider.response.status),
    "Cross-account disclosure",
  );
  const mine = await call(`/api/tasks/${taskId}`);
  assert.equal(mine.response.status, 200);
}
const successful = results
  .filter((r) => r.status === 200 || r.status === 201)
  .map((r) => r.ms)
  .sort((a, b) => a - b);
const percentile = (p) =>
  successful[
    Math.min(successful.length - 1, Math.ceil(p * successful.length) - 1)
  ];
const receipt = {
  target: url.hostname,
  measuredAt: new Date().toISOString(),
  concurrencyStages: [1, 5, 10],
  requests: results.length,
  p50ms: percentile(0.5),
  p95ms: percentile(0.95),
  maxms: successful.at(-1),
  taskId,
  results,
  scope:
    "Bounded preview smoke/concurrency probe; not sustained 10,000-user capacity or live payment acceptance",
};
fs.writeFileSync(
  process.env.BIDS_LOAD_REPORT ?? "/tmp/bids-hosted-load.json",
  JSON.stringify(receipt, null, 2),
);
console.log(
  JSON.stringify({
    requests: receipt.requests,
    p95ms: receipt.p95ms,
    concurrentCreationDeduplicated: Boolean(taskId),
    crossAccountDenied: Boolean(taskId),
  }),
);

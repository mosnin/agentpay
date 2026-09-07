import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
/** Atomic token bucket across all app instances, using the database clock. No raw IPs are persisted. */
export async function databaseRateLimit(
  key: string,
  cost: number,
  capacity: number,
  refillRate: number,
) {
  if (!Number.isFinite(cost) || cost <= 0 || cost > capacity)
    return { ok: false };
  const id = createHash("sha256").update(key).digest("hex");
  const rows = await prisma.$queryRaw<{ id: string }[]>`
 INSERT INTO "RateLimitBucket" (id,tokens,"updatedAt") VALUES (${id},${capacity - cost},CURRENT_TIMESTAMP)
 ON CONFLICT (id) DO UPDATE SET
 tokens=LEAST(${capacity}, "RateLimitBucket".tokens + GREATEST(0,EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-"RateLimitBucket"."updatedAt"))) * ${refillRate}) - ${cost},
 "updatedAt"=CURRENT_TIMESTAMP
 WHERE LEAST(${capacity}, "RateLimitBucket".tokens + GREATEST(0,EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP-"RateLimitBucket"."updatedAt"))) * ${refillRate}) >= ${cost}
 RETURNING id`;
  return { ok: rows.length === 1 };
}

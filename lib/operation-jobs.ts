import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A committed lease survives function crashes; a stale completion cannot clear a newer lease. */
export async function runOperation(
  jobId: "verify" | "settlements",
  work: () => Promise<Response>,
): Promise<Response> {
  const now = new Date(),
    token = randomUUID();
  const run = await prisma.$transaction(async (tx) => {
    await tx.operationJob.upsert({
      where: { id: jobId },
      create: { id: jobId },
      update: {},
    });
    const claim = await tx.operationJob.updateMany({
      where: {
        id: jobId,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      data: { leaseToken: token, leaseUntil: new Date(now.getTime() + 120000) },
    });
    if (!claim.count) return null;
    await tx.operationRun.updateMany({
      where: { jobId, state: "running" },
      data: {
        state: "interrupted",
        finishedAt: now,
        summary:
          "Lease expired before completion. The next scheduled run resumed reconciliation.",
      },
    });
    return tx.operationRun.create({ data: { jobId } });
  });
  if (!run)
    return Response.json(
      { error: "A run is already in progress." },
      { status: 409 },
    );
  // Bound retention cleanup per invocation; never delete active/recent buckets.
  await prisma.$executeRaw`DELETE FROM "RateLimitBucket" WHERE id IN (SELECT id FROM "RateLimitBucket" WHERE "updatedAt" < CURRENT_TIMESTAMP - interval '1 day' ORDER BY "updatedAt" LIMIT 1000)`;
  let response: Response;
  try {
    response = await work();
  } catch {
    response = Response.json(
      { error: "Operation failed. Review the run history." },
      { status: 503 },
    );
  }
  await prisma.$transaction(async (tx) => {
    const fenced = await tx.operationJob.updateMany({
      where: { id: jobId, leaseToken: token },
      data: {
        leaseToken: null,
        leaseUntil: null,
        ...(response.ok ? { lastSuccessAt: new Date() } : {}),
      },
    });
    if (fenced.count)
      await tx.operationRun.update({
        where: { id: run.id },
        data: {
          state: response.ok ? "succeeded" : "failed",
          finishedAt: new Date(),
          summary: `HTTP ${response.status}. ${response.ok ? "Batch completed." : "Inspect chain status and recovery queue."}`,
        },
      });
  });
  return response;
}

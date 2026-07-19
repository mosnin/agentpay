import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgentVerification } from "@/lib/verification";

export const dynamic = "force-dynamic";

/**
 * Scheduled re-verification sweep — the mechanism that makes "Verified"
 * revocable, not just earnable. Re-runs the verification program
 * (lib/verification.ts) for agents whose badge is stale (lastVerifiedAt
 * older than STALE_MS) or that have never passed (lastVerifiedAt null),
 * so an endpoint that goes dark, a schema that stops compiling, or an
 * owner identity that no longer checks out gets the badge pulled
 * automatically — runAgentVerification sets verified=false the moment its
 * checks stop passing, same as an on-demand run.
 *
 * Protected by a CRON_SECRET bearer token, following the platform
 * convention (e.g. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
 * automatically when that env var is set): with no secret configured this
 * always 503s — it never runs unprotected — matching
 * app/api/webhooks/clerk/route.ts's same "unconfigured -> 503" rule for a
 * secret-gated endpoint. Accepts GET (the method schedulers like Vercel
 * Cron use) and POST (for manual/external triggers) identically.
 *
 * Batched (BATCH_SIZE per invocation, so a large marketplace is worked
 * through over successive scheduled runs rather than one unbounded call)
 * and bounded-concurrency (CONCURRENCY at a time — each agent is a
 * different external endpoint, so running several health checks in
 * parallel is safe and keeps total wall time reasonable under a
 * serverless function timeout). Every agent is wrapped in its own
 * try/catch: one bad agent can't stop the sweep, and this route itself
 * never throws.
 */

const STALE_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 25;
const CONCURRENCY = 5;

function isAuthorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization");
  const match = header ? /^Bearer\s+(.+)$/i.exec(header.trim()) : null;
  return match?.[1]?.trim() === secret;
}

/** Bounded-concurrency batch runner — dependency-free (no p-limit in
 * package.json), matching this codebase's preference for small hand-rolled
 * helpers over adding a dependency for a few lines of logic. */
async function runBatch<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  async function next(): Promise<void> {
    const i = cursor++;
    if (i >= items.length) return;
    await worker(items[i]);
    return next();
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
}

async function handleSweep(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Verification cron is not configured (CRON_SECRET unset)." },
      { status: 503 },
    );
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const staleCutoff = new Date(Date.now() - STALE_MS);
    const candidates = await prisma.agent.findMany({
      where: { OR: [{ lastVerifiedAt: null }, { lastVerifiedAt: { lt: staleCutoff } }] },
      select: { id: true, verified: true },
      take: BATCH_SIZE,
    });

    let verified = 0;
    let failed = 0;
    let expired = 0;
    const errors: Array<{ agentId: string; error: string }> = [];

    await runBatch(candidates, CONCURRENCY, async (candidate) => {
      try {
        const outcome = await runAgentVerification(candidate.id);
        if (outcome.verified) {
          verified += 1;
        } else {
          failed += 1;
          // Was verified before this run and isn't anymore -> a badge just
          // got revoked, not merely a never-verified agent still not passing.
          if (candidate.verified) expired += 1;
        }
      } catch (err) {
        // runAgentVerification already guarantees it never throws — this is
        // belt-and-suspenders so a truly unexpected error (e.g. this
        // closure itself) still can't take down the rest of the batch.
        errors.push({ agentId: candidate.id, error: err instanceof Error ? err.message : String(err) });
      }
    });

    return NextResponse.json({
      ok: true,
      checked: candidates.length,
      verified,
      failed,
      expired,
      errors,
    });
  } catch (err) {
    console.error("verification cron sweep failed", err);
    return NextResponse.json({ error: "Verification sweep failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleSweep(request);
}

export async function POST(request: Request) {
  return handleSweep(request);
}

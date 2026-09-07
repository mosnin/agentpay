import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgentVerification } from "@/lib/verification";
import { resolveApiUser, getRateLimitKey } from "@/lib/api-auth";
import { strictRateLimit } from "@/lib/ratelimit";

// POST /api/agents/[id]/verify — run the verification program (lib/verification.ts)
// for one agent. `id` accepts either the agent id or its slug. Auth required
// (session or `Authorization: Bearer bids_...`); must be the agent's owner or
// an admin — running checks (and the endpoint probe they trigger) is not a
// public action.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await resolveApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const rl = await strictRateLimit(getRateLimitKey(request));
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { id } = await params;
    const agent = await prisma.agent.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, ownerId: true },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }
    if (user.role !== "admin" && agent.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only the agent owner or an admin can request verification." },
        { status: 403 },
      );
    }

    const outcome = await runAgentVerification(agent.id);

    return NextResponse.json({
      ok: true,
      verified: outcome.verified,
      verification_status: outcome.verificationStatus,
      verification_error: outcome.verificationError,
      last_verified_at: outcome.lastVerifiedAt,
      checks: outcome.checks.map((c) => ({
        kind: c.kind,
        passed: c.passed,
        skipped: c.skipped,
        detail: c.detail,
      })),
    });
  } catch (err) {
    console.error("POST /api/agents/[id]/verify failed", err);
    return NextResponse.json(
      { error: "Failed to run verification." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { runValidation } from "@/lib/actions/tasks";
import { resolveApiUser, getRateLimitKey } from "@/lib/api-auth";
import { strictRateLimit } from "@/lib/ratelimit";

// POST /api/tasks/[id]/validate — run automated validation on the latest artifact. Auth required.
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
    const res = await runValidation(id);

    if (!res.ok) {
      const status = /not found/i.test(res.error) ? 404 : 400;
      return NextResponse.json({ error: res.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      score: res.data!.score,
      status: res.data!.status,
    });
  } catch (err) {
    console.error("POST /api/tasks/[id]/validate failed", err);
    return NextResponse.json(
      { error: "Failed to run validation." },
      { status: 500 },
    );
  }
}

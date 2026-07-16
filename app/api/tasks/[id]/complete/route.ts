import { NextResponse } from "next/server";
import { completeTask } from "@/lib/actions/tasks";
import { getAuthedUser, getRateLimitKey } from "@/lib/api-auth";
import { strictRateLimit } from "@/lib/ratelimit";

// POST /api/tasks/[id]/complete — mark a task complete and release escrowed payment. Auth required.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthedUser();
    if (!auth.user) return auth.response;

    const rl = await strictRateLimit(getRateLimitKey(request));
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { id } = await params;
    const res = await completeTask(id);

    if (!res.ok) {
      const status = /not found/i.test(res.error) ? 404 : 400;
      return NextResponse.json({ error: res.error }, { status });
    }

    return NextResponse.json({ ok: true, status: "completed" });
  } catch (err) {
    console.error("POST /api/tasks/[id]/complete failed", err);
    return NextResponse.json(
      { error: "Failed to complete task." },
      { status: 500 },
    );
  }
}

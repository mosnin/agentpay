import { NextResponse } from "next/server";
import { submitArtifact } from "@/lib/actions/tasks";

// POST /api/tasks/[id]/artifacts — submit a deliverable for a task.
// Body: { title, type?, url?, content? } (provide url or content).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    const res = await submitArtifact(id, body);
    if (!res.ok) {
      const status = /not found/i.test(res.error) ? 404 : 400;
      return NextResponse.json({ error: res.error }, { status });
    }

    return NextResponse.json({ ok: true, status: "submitted" });
  } catch (err) {
    console.error("POST /api/tasks/[id]/artifacts failed", err);
    return NextResponse.json(
      { error: "Failed to submit artifact." },
      { status: 500 },
    );
  }
}

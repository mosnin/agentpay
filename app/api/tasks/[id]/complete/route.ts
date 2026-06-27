import { NextResponse } from "next/server";
import { completeTask } from "@/lib/actions/tasks";

// POST /api/tasks/[id]/complete — mark a task complete and release escrowed payment.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

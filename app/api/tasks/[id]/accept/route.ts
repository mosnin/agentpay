import { NextResponse } from "next/server";
import { acceptTask } from "@/lib/actions/tasks";

// POST /api/tasks/[id]/accept — seller agent accepts a pending task.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const res = await acceptTask(id);

    if (!res.ok) {
      const status = /not found/i.test(res.error) ? 404 : 400;
      return NextResponse.json({ error: res.error }, { status });
    }

    return NextResponse.json({ ok: true, status: "accepted" });
  } catch (err) {
    console.error("POST /api/tasks/[id]/accept failed", err);
    return NextResponse.json(
      { error: "Failed to accept task." },
      { status: 500 },
    );
  }
}

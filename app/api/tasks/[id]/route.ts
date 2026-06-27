import { NextResponse } from "next/server";
import { getTaskById } from "@/lib/queries";

// GET /api/tasks/[id] — fetch a single task (full detail).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const task = await getTaskById(id);

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (err) {
    console.error("GET /api/tasks/[id] failed", err);
    return NextResponse.json(
      { error: "Failed to load task." },
      { status: 500 },
    );
  }
}

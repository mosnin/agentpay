import { NextResponse } from "next/server";
import { getTaskById } from "@/lib/queries";
import { getAuthedUser } from "@/lib/api-auth";

// GET /api/tasks/[id] — fetch a single task (full detail). Auth required.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthedUser();
    if (!auth.user) return auth.response;

    const { id } = await params;
    const task = await getTaskById(id);

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    // Only the buyer or the agent owner may read a task via the API.
    const isParticipant =
      task.buyerId === auth.user.id || auth.user.role === "admin";
    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

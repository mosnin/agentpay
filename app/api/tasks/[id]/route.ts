import { NextResponse } from "next/server";
import { getTaskById } from "@/lib/queries";
import { resolveApiUser } from "@/lib/api-auth";

// GET /api/tasks/[id] — fetch a single task (full detail). Auth required.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await resolveApiUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id } = await params;
    const task = await getTaskById(id);

    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    // Only the buyer, the seller agent's owner, or an admin may read a task
    // via the API — the seller side is what lets a headless agent fetch its
    // own assignment (including the contract's output_schema) by key.
    const isParticipant =
      task.buyerId === user.id ||
      task.sellerAgent?.ownerId === user.id ||
      user.role === "admin";
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

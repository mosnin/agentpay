import { NextResponse } from "next/server";
import { resolveApiUser } from "@/lib/api-auth";
import { checkoutForTask } from "@/lib/payments";
export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { taskId } = await request.json();
    if (typeof taskId !== "string") return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    return NextResponse.json({ url: await checkoutForTask(taskId, user.id) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout could not start" }, { status: 400 }); }
}

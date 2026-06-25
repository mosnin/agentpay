import { NextResponse } from "next/server";
import { apiCreateTaskSchema } from "@/lib/schemas";
import { createTask } from "@/lib/actions/tasks";
import { getTaskById } from "@/lib/queries";

/** Derive a concise title from the first ~8 words of the objective. */
function titleFromObjective(objective: string): string {
  const words = objective.trim().split(/\s+/).slice(0, 8).join(" ");
  return words.length > 0 ? words : "Untitled task";
}

// POST /api/tasks — create a task programmatically (A2A-style contract body).
// Auth is mocked for the MVP: the task is created on behalf of the demo operator.
export async function POST(request: Request) {
  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    const parsed = apiCreateTaskSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }
    const body = parsed.data;

    const sellerAgentId = body.seller_agent_id || body.agent_id;
    if (!sellerAgentId) {
      return NextResponse.json(
        { error: "seller_agent_id (or agent_id) is required." },
        { status: 400 },
      );
    }

    const values = {
      title: body.title ?? titleFromObjective(body.objective),
      objective: body.objective,
      category: body.category,
      sellerAgentId,
      inputInstructions: "",
      inputDataUrl: "",
      expectedOutputFormat: body.output_schema
        ? JSON.stringify(body.output_schema)
        : "",
      budget: body.budget,
      deadline: "",
      validationRules: body.validation_rules
        ? JSON.stringify(body.validation_rules)
        : "",
      paymentMode: body.payment_mode,
      visibility: "public",
    };

    const res = await createTask(values);
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    const task = await getTaskById(res.data!.id);
    if (!task) {
      return NextResponse.json(
        { error: "Task was created but could not be loaded." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        task_id: task.id,
        status: task.status,
        payment: {
          mode: task.payment?.mode ?? body.payment_mode,
          status: task.payment?.status ?? "pending",
          amount: task.payment?.amount ?? task.budget,
          currency: task.payment?.currency ?? task.currency,
        },
        seller_agent: {
          id: task.sellerAgent?.id ?? sellerAgentId,
          name: task.sellerAgent?.name ?? null,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/tasks failed", err);
    return NextResponse.json(
      { error: "Failed to create task." },
      { status: 500 },
    );
  }
}

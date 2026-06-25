import { NextResponse } from "next/server";
import { getAgentByIdOrSlug } from "@/lib/queries";
import { getAgentCard } from "@/lib/interop/a2aAdapter";

// GET /api/agents/[id] — a single agent's machine-readable card + profile fields.
// `id` accepts either the agent id or its slug.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const agent = await getAgentByIdOrSlug(id);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const card = getAgentCard(agent);

    return NextResponse.json({
      ...card,
      slug: agent.slug,
      short_description: agent.shortDescription,
      long_description: agent.longDescription,
      status: agent.status,
      average_rating: agent.averageRating,
      total_tasks_completed: agent.totalTasksCompleted,
      average_latency_minutes: agent.averageLatencyMinutes,
      organization: agent.organization
        ? { id: agent.organization.id, name: agent.organization.name }
        : null,
      review_count: agent._count.reviews,
      created_at: agent.createdAt,
    });
  } catch (err) {
    console.error("GET /api/agents/[id] failed", err);
    return NextResponse.json(
      { error: "Failed to load agent." },
      { status: 500 },
    );
  }
}

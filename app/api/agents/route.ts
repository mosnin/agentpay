import { NextResponse, type NextRequest } from "next/server";
import { getAgents } from "@/lib/queries";
import { createAgent } from "@/lib/actions/agents";
import { getAgentCard } from "@/lib/interop/a2aAdapter";
import type { MarketplaceSort } from "@/lib/constants";

// GET /api/agents — list agents as machine-readable A2A cards.
// Query params: q (search), category, sort (reputation|rating|completion|price_asc|price_desc|newest)
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const q = params.get("q") ?? undefined;
    const category = params.get("category") ?? undefined;
    const sort = (params.get("sort") as MarketplaceSort | null) ?? undefined;

    const agents = await getAgents({ q, category, sort });

    const data = agents.map((agent) => ({
      ...getAgentCard(agent),
      id: agent.id,
      slug: agent.slug,
      shortDescription: agent.shortDescription,
    }));

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/agents failed", err);
    return NextResponse.json(
      { error: "Failed to list agents." },
      { status: 500 },
    );
  }
}

// POST /api/agents — register (list) an agent from a JSON profile body.
// Mirrors POST /api/tasks: validates + delegates to the createAgent action.
// Auth is mocked for the MVP: the agent is created on behalf of the demo operator.
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
    const body = (raw ?? {}) as Record<string, unknown>;

    // Accept snake_case (API-idiomatic) with camelCase fallbacks; nested schema
    // objects are stringified to the form the createAgent schema expects.
    const values = {
      name: body.name,
      shortDescription: body.short_description ?? body.shortDescription,
      longDescription:
        body.long_description ?? body.longDescription ?? body.description,
      category: body.category,
      capabilities: body.capabilities,
      pricingModel: body.pricing_model ?? body.pricingModel ?? "per_task",
      startingPrice: body.starting_price ?? body.startingPrice ?? body.price,
      currency: body.currency ?? "USD",
      endpointUrl: body.endpoint_url ?? body.endpointUrl ?? "",
      mcpServerUrl: body.mcp_server_url ?? body.mcpServerUrl ?? "",
      inputSchema: body.input_schema ? JSON.stringify(body.input_schema) : "",
      outputSchema: body.output_schema ? JSON.stringify(body.output_schema) : "",
    };

    const res = await createAgent(values);
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        agent_id: res.data!.id,
        slug: res.data!.slug,
        url: `/agents/${res.data!.slug}`,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/agents failed", err);
    return NextResponse.json(
      { error: "Failed to create agent." },
      { status: 500 },
    );
  }
}

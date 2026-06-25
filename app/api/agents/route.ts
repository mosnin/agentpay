import { NextResponse, type NextRequest } from "next/server";
import { getAgents } from "@/lib/queries";
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

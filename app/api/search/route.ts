import { NextResponse, type NextRequest } from "next/server";
import { searchAgents } from "@/lib/search";
import { getRateLimitKey } from "@/lib/api-auth";
import { rateLimit } from "@/lib/ratelimit";

const MIN_QUERY_LENGTH = 2;

// GET /api/search?q= — quick agent search for the ⌘K command palette.
// Public read endpoint: the marketplace itself is public, so this mirrors
// GET /api/agents in requiring no auth. Unlike that route this one is called
// on every debounced keystroke, so it's rate-limited like other API traffic.
//
// The heavy lifting — Postgres full-text search combined with pg_trgm
// similarity for typo tolerance, with an ILIKE fallback if either is
// unavailable — lives in lib/search.ts so it can be reused outside this
// route (and unit tested without a live DB). This route's job is just the
// HTTP contract: rate limit, short-circuit short queries, and keep the
// response shape ({ agents: AgentSearchHit[] }) stable for
// components/layout/search-command.tsx.
export async function GET(request: NextRequest) {
  try {
    const rl = await rateLimit(await getRateLimitKey(request));
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const q = request.nextUrl.searchParams.get("q") ?? "";
    if (q.trim().length < MIN_QUERY_LENGTH) {
      return NextResponse.json({ agents: [] });
    }

    const agents = await searchAgents(q);
    return NextResponse.json({ agents });
  } catch (err) {
    console.error("GET /api/search failed", err);
    return NextResponse.json({ agents: [] }, { status: 500 });
  }
}

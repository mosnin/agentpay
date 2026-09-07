import { NextRequest, NextResponse } from "next/server";
import { getAgentSelectOptions } from "@/lib/queries";
import { getRateLimitKey } from "@/lib/api-auth";
import { rateLimit } from "@/lib/ratelimit";
export async function GET(request: NextRequest) {
  const rl = await rateLimit(`agent-options:${getRateLimitKey(request)}`);
  if (!rl.ok)
    return NextResponse.json(
      { error: "Too many searches. Try again in a moment." },
      { status: 429, headers: { "Retry-After": "1" } },
    );
  try {
    return NextResponse.json({
      agents: await getAgentSelectOptions(
        request.nextUrl.searchParams.get("q") ?? "",
      ),
    });
  } catch {
    return NextResponse.json(
      { error: "Search is unavailable. Try again." },
      { status: 503 },
    );
  }
}

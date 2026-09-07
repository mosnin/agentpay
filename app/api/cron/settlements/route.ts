import { runOperation, cronAuthorized } from "@/lib/operation-jobs";
import { NextResponse } from "next/server";
import { observeSettlements } from "@/lib/settlement/observer";
export const maxDuration = 60;
async function run(r: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected)
    return NextResponse.json(
      { error: "Settlement scheduler is not configured." },
      { status: 503 },
    );
  if (!cronAuthorized(r))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return runOperation("settlements", async () => {
    try {
      const results = await observeSettlements();
      return NextResponse.json(
        { results },
        { status: results.some((r) => r.error || r.halted) ? 503 : 200 },
      );
    } catch {
      return NextResponse.json(
        { error: "Settlement reconciliation needs attention." },
        { status: 503 },
      );
    }
  });
}
export const POST = run;
export const GET = run;

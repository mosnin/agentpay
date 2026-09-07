import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { observeSettlements } from "@/lib/settlement/observer";
export const maxDuration = 60;
async function run(r: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected)
    return NextResponse.json(
      { error: "Settlement scheduler is not configured." },
      { status: 503 },
    );
  const actual = r.headers.get("authorization") || "";
  const target = `Bearer ${expected}`;
  if (
    Buffer.byteLength(actual) !== Buffer.byteLength(target) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(target))
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
}
export const POST = run;
export const GET = run;

import { NextResponse } from "next/server";
import { runValidation } from "@/lib/actions/tasks";

// POST /api/tasks/[id]/validate — run automated validation on the latest artifact.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const res = await runValidation(id);

    if (!res.ok) {
      const status = /not found/i.test(res.error) ? 404 : 400;
      return NextResponse.json({ error: res.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      score: res.data!.score,
      status: res.data!.status,
    });
  } catch (err) {
    console.error("POST /api/tasks/[id]/validate failed", err);
    return NextResponse.json(
      { error: "Failed to run validation." },
      { status: 500 },
    );
  }
}

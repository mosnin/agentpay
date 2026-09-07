import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTrustReport } from "@/lib/trust/queries";
import { getCurrentUser } from "@/lib/auth";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const a = await prisma.agent.findUnique({ where: { id } });
  const u = await getCurrentUser();
  if (
    !a ||
    (a.status !== "active" && a.ownerId !== u?.id && u?.role !== "admin")
  )
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await getTrustReport(a.ownerId, a.id);
  return NextResponse.json(
    {
      model: r.model,
      calculatedAt: r.calculatedAt,
      windowDays: r.windowDays,
      seller: r.seller,
      historyLimited: r.historyLimited,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

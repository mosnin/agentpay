import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Readiness probe: confirms the app is up and the database is reachable.
// 200 when healthy, 503 when the DB check fails — suitable for load balancers,
// uptime monitors, and container orchestration health checks.
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "up",
      latencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("GET /api/health failed", err);
    return NextResponse.json(
      {
        status: "degraded",
        db: "down",
        latencyMs: Date.now() - startedAt,
        time: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

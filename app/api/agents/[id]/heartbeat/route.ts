import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { strictRateLimit } from "@/lib/ratelimit";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveApiUser(request);
  if (!user)
    return NextResponse.json(
      { error: "Unauthorized or insufficient key permissions." },
      { status: 401 },
    );
  if (!(await strictRateLimit(`heartbeat:${user.id}`)).ok)
    return NextResponse.json(
      { error: "Too many heartbeats." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  const { id } = await params;
  const parsed = z
    .object({ capacity: z.number().int().min(0).max(100) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "capacity must be an integer from 0 to 100." },
      { status: 400 },
    );
  const saved = await prisma.agent.updateMany({
    where: { id, ownerId: user.id, status: "active" },
    data: { workerSeenAt: new Date(), workerCapacity: parsed.data.capacity },
  });
  if (!saved.count)
    return NextResponse.json(
      { error: "Active owned agent not found." },
      { status: 404 },
    );
  return NextResponse.json({
    ok: true,
    expires_in_seconds: 120,
    capacity: parsed.data.capacity,
    evidence: "Authenticated worker report; not proof of successful execution.",
  });
}

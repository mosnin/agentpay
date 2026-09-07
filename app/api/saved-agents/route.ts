import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { strictRateLimit } from "@/lib/ratelimit";
export async function POST(request: Request) {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  if (!(await strictRateLimit(`saved:${a.user.id}`)).ok)
    return Response.json(
      { error: "Please wait before trying again." },
      { status: 429 },
    );
  const body = await request.json().catch(() => null);
  if (typeof body?.agentId !== "string" || typeof body?.saved !== "boolean")
    return Response.json(
      { error: "Agent and saved state required." },
      { status: 400 },
    );
  const agent = await prisma.agent.findFirst({
    where: { id: body.agentId, status: { not: "suspended" } },
    select: { id: true },
  });
  if (!agent)
    return Response.json({ error: "Agent not found." }, { status: 404 });
  if (body.saved)
    await prisma.savedAgent.upsert({
      where: { userId_agentId: { userId: a.user.id, agentId: agent.id } },
      create: { userId: a.user.id, agentId: agent.id },
      update: {},
    });
  else
    await prisma.savedAgent.deleteMany({
      where: { userId: a.user.id, agentId: agent.id },
    });
  return Response.json({ saved: body.saved });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
export async function POST(r: Request) {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  const b = z
    .object({
      findingId: z.string(),
      reason: z.string().trim().min(20).max(3000),
    })
    .safeParse(await r.json().catch(() => null));
  if (!b.success)
    return NextResponse.json(
      { error: "Provide a finding and a reason of 20–3,000 characters." },
      { status: 400 },
    );
  const f = await prisma.trustFinding.findFirst({
    where: {
      id: b.data.findingId,
      subjectUserId: a.user.id,
      supersededAt: null,
    },
  });
  if (!f)
    return NextResponse.json({ error: "Finding not found." }, { status: 404 });
  const appeal = await prisma.trustAppeal.upsert({
    where: { userId_findingId: { userId: a.user.id, findingId: f.id } },
    create: { ...b.data, userId: a.user.id },
    update: {},
  });
  return NextResponse.json({ id: appeal.id, state: appeal.state });
}

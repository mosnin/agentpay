import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const a = await getAdminUser();
  if (a.response) return a.response;
  return NextResponse.json(
    await prisma.trustAppeal.findMany({
      where: { state: "open" },
      include: { finding: true },
      take: 100,
      orderBy: { createdAt: "asc" },
    }),
  );
}
export async function POST(r: Request) {
  const a = await getAdminUser();
  if (a.response) return a.response;
  const b = z
    .object({
      taskId: z.string(),
      disputeId: z.string(),
      subjectUserId: z.string(),
      outcome: z.enum(["breach", "cleared"]),
      publicReason: z.string().trim().min(20).max(2000),
    })
    .safeParse(await r.json().catch(() => null));
  if (!b.success)
    return NextResponse.json({ error: "Invalid finding." }, { status: 400 });
  const t = await prisma.task.findUnique({
    where: { id: b.data.taskId },
    include: { sellerAgent: true, disputes: true },
  });
  if (
    !t ||
    ![t.buyerId, t.sellerAgent?.ownerId].includes(b.data.subjectUserId) ||
    !t.disputes.some(
      (d) =>
        d.id === b.data.disputeId &&
        ["resolved", "rejected"].includes(d.status),
    )
  )
    return NextResponse.json(
      {
        error:
          "A resolved dispute for this agreement and participant is required.",
      },
      { status: 409 },
    );
  if ([t.buyerId, t.sellerAgent?.ownerId].includes(a.user.id))
    return NextResponse.json(
      { error: "An independent administrator must decide this finding." },
      { status: 403 },
    );
  const f = await prisma.$transaction(
    async (tx) => {
      await tx.trustFinding.updateMany({
        where: {
          disputeId: b.data.disputeId,
          subjectUserId: b.data.subjectUserId,
          supersededAt: null,
        },
        data: { supersededAt: new Date() },
      });
      return tx.trustFinding.create({
        data: { ...b.data, decidedById: a.user.id },
      });
    },
    { isolationLevel: "Serializable" },
  );
  return NextResponse.json(f);
}
export async function PATCH(r: Request) {
  const a = await getAdminUser();
  if (a.response) return a.response;
  const b = z
    .object({
      appealId: z.string(),
      decision: z.enum(["upheld", "corrected"]),
      response: z.string().trim().min(20).max(2000),
    })
    .safeParse(await r.json().catch(() => null));
  if (!b.success)
    return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  const appeal = await prisma.trustAppeal.findUnique({
    where: { id: b.data.appealId },
    include: {
      finding: { include: { task: { include: { sellerAgent: true } } } },
    },
  });
  if (!appeal || appeal.state !== "open")
    return NextResponse.json(
      { error: "Open appeal not found." },
      { status: 409 },
    );
  if (
    [
      appeal.userId,
      appeal.finding.decidedById,
      appeal.finding.task.buyerId,
      appeal.finding.task.sellerAgent?.ownerId,
    ].includes(a.user.id)
  )
    return NextResponse.json(
      { error: "An independent reviewer is required." },
      { status: 403 },
    );
  await prisma.$transaction(async (tx) => {
    const changed = await tx.trustAppeal.updateMany({
      where: { id: appeal.id, state: "open" },
      data: {
        state: b.data.decision,
        response: b.data.response,
        reviewedById: a.user.id,
        reviewedAt: new Date(),
      },
    });
    if (!changed.count) throw Error("Appeal changed");
    if (b.data.decision === "corrected")
      await tx.trustFinding.update({
        where: { id: appeal.findingId },
        data: { supersededAt: new Date() },
      });
  });
  return NextResponse.json({ state: b.data.decision });
}

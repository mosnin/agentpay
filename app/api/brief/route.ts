import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/api-auth";
import { strictRateLimit } from "@/lib/ratelimit";
import { z } from "zod";
const schema = z.object({
  revision: z.number().int().min(0),
  fork: z.boolean().optional(),
  values: z.object({
    title: z.string().max(180).optional(),
    objective: z.string().max(10000).optional(),
    category: z.string().max(80).optional(),
    sellerAgentId: z.string().max(100).optional(),
    inputInstructions: z.string().max(10000).optional(),
    inputDataUrl: z.string().max(2000).optional(),
    expectedOutputFormat: z.string().max(10000).optional(),
    budget: z.number().min(0).max(1000000).optional(),
    deadline: z.string().max(40).optional(),
    validationRules: z.string().max(10000).optional(),
    paymentRail: z.enum(["stripe", "crypto"]).optional(),
    paymentMode: z
      .enum(["pay_per_task", "mock_escrow", "subscription_access", "bounty"])
      .optional(),
    visibility: z.enum(["public", "private", "unlisted"]).optional(),
  }),
});
export async function PUT(request: Request) {
  const auth = await getAuthedUser();
  if (auth.response) return auth.response;
  if (!(await strictRateLimit(`brief:${auth.user.id}`)).ok)
    return Response.json(
      { error: "Please wait before saving again." },
      { status: 429 },
    );
  const text = await request.text();
  if (text.length > 50000)
    return Response.json({ error: "Brief is too large." }, { status: 413 });
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return Response.json(
      { error: "Complete the brief fields before saving." },
      { status: 400 },
    );
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${auth.user.id} FOR UPDATE`;
    const current = await tx.taskBrief.findUnique({
      where: { userId: auth.user.id },
    });
    if ((current?.revision ?? 0) !== parsed.data.revision) return null;
    return tx.taskBrief.upsert({
      where: { userId: auth.user.id },
      create: { userId: auth.user.id, values: parsed.data.values },
      update: {
        values: parsed.data.values,
        revision: { increment: 1 },
        ...(parsed.data.fork ? { creationKey: randomUUID() } : {}),
      },
    });
  });
  return result
    ? Response.json({
        revision: result.revision,
        creationKey: result.creationKey,
      })
    : Response.json(
        {
          error:
            "This brief changed in another tab. Reload to recover the latest saved version.",
        },
        { status: 409 },
      );
}
export async function DELETE(request: Request) {
  const auth = await getAuthedUser();
  if (auth.response) return auth.response;
  const revision = Number(request.headers.get("if-match"));
  if (!Number.isInteger(revision) || revision < 1)
    return Response.json(
      { error: "Saved revision required." },
      { status: 400 },
    );
  const deleted = await prisma.taskBrief.deleteMany({
    where: { userId: auth.user.id, revision },
  });
  return Response.json(
    { deleted: deleted.count > 0 },
    { status: deleted.count ? 200 : 409 },
  );
}

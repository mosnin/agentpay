"use server";
import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { strictRateLimit } from "@/lib/ratelimit";
import { z } from "zod";
export async function submitServiceReport(form: FormData) {
  const user = await requireUser();
  if (!(await strictRateLimit(`support:${user.id}`)).ok)
    throw new Error("Please wait before submitting another report.");
  const data = z
    .object({
      subject: z.string().trim().min(5).max(180),
      detail: z.string().trim().min(20).max(5000),
      taskId: z.string().max(100),
    })
    .parse(Object.fromEntries(form));
  if (
    data.taskId &&
    !(await prisma.task.findFirst({
      where: {
        id: data.taskId,
        OR: [{ buyerId: user.id }, { sellerAgent: { ownerId: user.id } }],
      },
      select: { id: true },
    }))
  )
    throw new Error("Task not found in your account.");
  await prisma.$transaction(async (tx) => {
    const report = await tx.serviceReport.create({
      data: { ...data, taskId: data.taskId || null, userId: user.id },
    });
    await tx.operationAudit.create({
      data: { actorId: user.id, action: "report_opened", targetId: report.id },
    });
  });
  revalidatePath("/support");
}
export async function resolveServiceReport(form: FormData) {
  const user = await requireAdmin();
  const data = z
    .object({
      id: z.string().min(1),
      state: z.enum(["reviewing", "resolved"]),
      response: z.string().trim().min(10).max(3000),
    })
    .parse(Object.fromEntries(form));
  await prisma.$transaction(async (tx) => {
    await tx.serviceReport.update({
      where: { id: data.id },
      data: { state: data.state, response: data.response },
    });
    await tx.operationAudit.create({
      data: {
        actorId: user.id,
        action: `report_${data.state}`,
        targetId: data.id,
      },
    });
  });
  revalidatePath("/support");
}

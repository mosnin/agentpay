"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function retryOutbox(form: FormData) {
  const user = await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (!id || id.length > 100) throw new Error("Invalid event.");
  await prisma.$transaction(async (tx) => {
    const updated = await tx.taskOutbox.updateMany({
      where: {
        id,
        deliveredAt: null,
        attempts: { gte: 8 },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
      },
      data: {
        attempts: 0,
        nextAttemptAt: new Date(),
        lockedUntil: null,
        lastError: null,
      },
    });
    if (!updated.count)
      throw new Error("Event is no longer eligible for retry.");
    await tx.operationAudit.create({
      data: { actorId: user.id, action: "retry_notification", targetId: id },
    });
  });
  revalidatePath("/admin/operations");
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { reviewSchema } from "@/lib/schemas";
import { onReviewCreated } from "@/lib/reputation";
import type { ActionResult } from "@/lib/types";

export async function createReview(
  taskId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const user = await requireUser();
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { sellerAgentId: true, status: true },
    });
    if (!task) return { ok: false, error: "Task not found." };
    if (!task.sellerAgentId) return { ok: false, error: "Task has no assigned agent." };
    if (task.status !== "completed") {
      return { ok: false, error: "You can only review a completed task." };
    }

    const existing = await prisma.review.findFirst({
      where: { taskId, userId: user.id },
    });
    if (existing) {
      return { ok: false, error: "You already reviewed this task." };
    }

    await prisma.review.create({
      data: {
        taskId,
        agentId: task.sellerAgentId,
        userId: user.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
      },
    });

    await onReviewCreated(task.sellerAgentId, taskId, parsed.data.rating);

    revalidatePath(`/tasks/${taskId}`);
    revalidatePath("/seller");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("createReview failed", err);
    return { ok: false, error: "Could not submit review." };
  }
}

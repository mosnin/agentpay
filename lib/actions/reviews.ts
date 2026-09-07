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
      select: {
        sellerAgentId: true,
        status: true,
        buyerId: true,
        payment: { select: { status: true } },
      },
    });
    if (!task) return { ok: false, error: "Task not found." };
    if (!task.sellerAgentId) return { ok: false, error: "Task has no assigned agent." };
    // Reputation integrity: only the buyer who actually commissioned (and
    // paid for) this specific task may leave a review on it — otherwise
    // anyone signed in could inflate or tank an agent's score for work they
    // had no part in.
    if (task.buyerId !== user.id) {
      return {
        ok: false,
        error: "You can only review a task you paid for and completed.",
      };
    }
    if (task.status !== "completed") {
      return { ok: false, error: "You can only review a completed task." };
    }
    // Belt-and-suspenders on top of the status check: `completed` and
    // "payment released" are set by two separate calls in finishTask()
    // (lib/actions/tasks.ts), so if payment release ever fails after the
    // status flip already committed, the task would otherwise look
    // reviewable despite no money having actually moved.
    if (task.payment?.status !== "released") {
      return {
        ok: false,
        error: "You can only review a task you paid for and completed.",
      };
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

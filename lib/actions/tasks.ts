"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { mockHash } from "@/lib/utils";
import {
  createTaskSchema,
  submitArtifactSchema,
  disputeSchema,
} from "@/lib/schemas";
import { createPaymentForTask, releasePaymentForTask, refundPaymentForTask } from "@/lib/payments";
import {
  onTaskCompleted,
  onDisputeOpened,
  onDisputeDismissed,
  onValidationComplete,
} from "@/lib/reputation";
import { evaluateArtifact } from "@/lib/mockValidation";
import type { ActionResult } from "@/lib/types";

function parseOutputSchema(text?: string): object | undefined {
  if (!text || !text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return { format: text.trim() };
  }
}

function revalidateTask(taskId: string) {
  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
  revalidatePath("/seller");
  revalidatePath("/admin");
}

export async function createTask(
  values: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTaskSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  try {
    const user = await requireUser();
    const agent = await prisma.agent.findUnique({
      where: { id: input.sellerAgentId },
      select: { id: true },
    });
    if (!agent) return { ok: false, error: "Selected agent does not exist." };

    const task = await prisma.task.create({
      data: {
        title: input.title,
        objective: input.objective,
        category: input.category,
        status: "pending",
        visibility: input.visibility,
        budget: input.budget,
        currency: "USD",
        deadline: input.deadline ? new Date(input.deadline) : null,
        buyerId: user.id,
        sellerAgentId: input.sellerAgentId,
        contract: {
          create: {
            inputPayload: {
              objective: input.objective,
              instructions: input.inputInstructions || "",
              data_url: input.inputDataUrl || null,
            },
            outputSchema: parseOutputSchema(input.expectedOutputFormat),
            validationRules: input.validationRules
              ? input.validationRules
                  .split("\n")
                  .map((r) => r.trim())
                  .filter(Boolean)
              : undefined,
            paymentMode: input.paymentMode,
            successCriteria:
              "Artifact must satisfy the output schema and pass validation (score ≥ 80).",
            contractHash: mockHash("contract", `${input.title}:${input.objective}`),
          },
        },
      },
    });

    await createPaymentForTask({
      taskId: task.id,
      amount: input.budget,
      currency: "USD",
      mode: input.paymentMode,
    });

    revalidateTask(task.id);
    revalidatePath("/marketplace");
    return { ok: true, data: { id: task.id } };
  } catch (err) {
    console.error("createTask failed", err);
    return { ok: false, error: "Could not create task. Please try again." };
  }
}

async function transition(
  taskId: string,
  allowedFrom: string[],
  to: string,
): Promise<ActionResult> {
  await requireUser();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { status: true },
  });
  if (!task) return { ok: false, error: "Task not found." };
  if (!allowedFrom.includes(task.status)) {
    return { ok: false, error: `Cannot move a ${task.status} task to ${to}.` };
  }
  await prisma.task.update({ where: { id: taskId }, data: { status: to as never } });
  revalidateTask(taskId);
  return { ok: true };
}

export async function acceptTask(taskId: string): Promise<ActionResult> {
  return transition(taskId, ["pending"], "accepted");
}

export async function startTask(taskId: string): Promise<ActionResult> {
  return transition(taskId, ["accepted"], "running");
}

export async function cancelTask(taskId: string): Promise<ActionResult> {
  const res = await transition(
    taskId,
    ["draft", "pending", "accepted", "running"],
    "cancelled",
  );
  if (res.ok) await refundPaymentForTask(taskId);
  return res;
}

/**
 * SSRF guard: artifact URLs must be public https:// endpoints.
 * Blocks private-network ranges, localhost, and file:// / data:// schemes.
 */
function validateArtifactUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "Artifact URL is not a valid URL.";
  }
  if (parsed.protocol !== "https:") {
    return "Artifact URL must use HTTPS.";
  }
  const host = parsed.hostname.toLowerCase();
  // Block localhost and common loopback aliases
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return "Artifact URL may not target localhost.";
  }
  // Block private RFC-1918 ranges: 10.x, 172.16-31.x, 192.168.x, 169.254.x (link-local)
  if (
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return "Artifact URL may not target a private network address.";
  }
  return null;
}

export async function submitArtifact(
  taskId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = submitArtifactSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;
  // (content-or-url is now enforced by submitArtifactSchema's refine.)

  // SSRF prevention: validate any URL before it enters the database.
  if (input.url) {
    const urlError = validateArtifactUrl(input.url);
    if (urlError) return { ok: false, error: urlError };
  }

  try {
    await requireUser();
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (!task) return { ok: false, error: "Task not found." };
    if (!["accepted", "running", "submitted"].includes(task.status)) {
      return { ok: false, error: `Cannot submit an artifact for a ${task.status} task.` };
    }

    await prisma.artifact.create({
      data: {
        taskId,
        title: input.title,
        type: input.type,
        url: input.url || null,
        content: input.content || null,
        validationStatus: "pending",
      },
    });
    await prisma.task.update({ where: { id: taskId }, data: { status: "submitted" } });
    revalidateTask(taskId);
    return { ok: true };
  } catch (err) {
    console.error("submitArtifact failed", err);
    return { ok: false, error: "Could not submit artifact." };
  }
}

export async function runValidation(taskId: string): Promise<ActionResult<{ score: number; status: string }>> {
  try {
    await requireUser();
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        contract: true,
        artifacts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!task) return { ok: false, error: "Task not found." };
    const artifact = task.artifacts[0];
    if (!artifact) return { ok: false, error: "No artifact to validate. Submit one first." };

    await prisma.task.update({ where: { id: taskId }, data: { status: "validating" } });

    const outcome = evaluateArtifact({
      artifactId: artifact.id,
      taskId: task.id,
      hasArtifactBody: Boolean(artifact.content || artifact.url),
      hasOutputSchema: Boolean(task.contract?.outputSchema),
    });

    await prisma.artifact.update({
      where: { id: artifact.id },
      data: {
        validationStatus: outcome.status,
        validationScore: outcome.score,
        validationNotes: outcome.notes,
      },
    });

    if (task.sellerAgentId) {
      await onValidationComplete(task.sellerAgentId, task.id, outcome.score);
    }

    revalidateTask(taskId);
    return { ok: true, data: { score: outcome.score, status: outcome.status } };
  } catch (err) {
    console.error("runValidation failed", err);
    return { ok: false, error: "Validation failed to run." };
  }
}

export async function completeTask(taskId: string): Promise<ActionResult> {
  try {
    await requireUser();
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true, sellerAgentId: true },
    });
    if (!task) return { ok: false, error: "Task not found." };
    if (!["submitted", "validating"].includes(task.status)) {
      return { ok: false, error: `Cannot complete a ${task.status} task.` };
    }

    await prisma.task.update({ where: { id: taskId }, data: { status: "completed" } });
    await releasePaymentForTask(taskId);
    if (task.sellerAgentId) {
      await onTaskCompleted(task.sellerAgentId, taskId);
    }

    revalidateTask(taskId);
    return { ok: true };
  } catch (err) {
    console.error("completeTask failed", err);
    return { ok: false, error: "Could not complete task." };
  }
}

// Demo runner: auto-advance an active task through the full happy path so a new
// user can watch the core loop resolve in seconds. It reuses the real
// transitions, so it genuinely exercises validation, payment, and reputation.
export async function simulateTask(taskId: string): Promise<ActionResult> {
  try {
    await requireUser();
    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (!existing) return { ok: false, error: "Task not found." };
    if (["completed", "cancelled", "disputed"].includes(existing.status)) {
      return { ok: false, error: `This task is already ${existing.status}.` };
    }

    let status = existing.status;

    if (status === "pending") {
      const r = await acceptTask(taskId);
      if (!r.ok) return r;
      status = "accepted";
    }
    if (status === "accepted") {
      const r = await startTask(taskId);
      if (!r.ok) return r;
      status = "running";
    }
    if (status === "running") {
      const r = await submitArtifact(taskId, {
        title: "Demo deliverable",
        type: "json",
        content: JSON.stringify(
          {
            summary: "Simulated artifact produced by the demo runner.",
            records: 42,
            confidence: 0.95,
          },
          null,
          2,
        ),
      });
      if (!r.ok) return r;
      status = "submitted";
    }
    if (status === "submitted") {
      const r = await runValidation(taskId);
      if (!r.ok) return r;
      status = "validating";
    }
    if (status === "validating") {
      const r = await completeTask(taskId);
      if (!r.ok) return r;
    }

    revalidateTask(taskId);
    return { ok: true };
  } catch (err) {
    console.error("simulateTask failed", err);
    return { ok: false, error: "Demo run failed." };
  }
}

export async function openDispute(
  taskId: string,
  values: unknown,
): Promise<ActionResult> {
  const parsed = disputeSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const user = await requireUser();
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { sellerAgentId: true },
    });
    if (!task) return { ok: false, error: "Task not found." };

    await prisma.dispute.create({
      data: { taskId, openedById: user.id, reason: parsed.data.reason, status: "open" },
    });
    await prisma.task.update({ where: { id: taskId }, data: { status: "disputed" } });
    if (task.sellerAgentId) await onDisputeOpened(task.sellerAgentId, taskId);

    revalidateTask(taskId);
    return { ok: true };
  } catch (err) {
    console.error("openDispute failed", err);
    return { ok: false, error: "Could not open dispute." };
  }
}

export async function resolveDispute(
  disputeId: string,
  resolution: string,
  status: "resolved" | "rejected",
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role !== "admin") return { ok: false, error: "Forbidden: admin role required." };
    // Enforce the data invariant at the boundary, not just in the dialog:
    // a resolved/rejected dispute must carry a non-empty resolution note.
    const note = resolution.trim();
    if (!note) return { ok: false, error: "A resolution note is required." };
    const dispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: { status, resolution: note },
      select: { taskId: true },
    });

    // Lift the task out of "disputed" so its lifecycle can continue — otherwise a
    // resolved dispute leaves the task stuck. We don't persist the pre-dispute
    // status, so restore to a sensible point: "submitted" if a deliverable exists
    // (re-validate → complete), else "accepted" (the agent resumes work).
    const task = await prisma.task.findUnique({
      where: { id: dispute.taskId },
      select: {
        status: true,
        sellerAgentId: true,
        _count: { select: { artifacts: true } },
      },
    });
    if (task?.status === "disputed") {
      const restored: "submitted" | "accepted" =
        task._count.artifacts > 0 ? "submitted" : "accepted";
      await prisma.task.update({
        where: { id: dispute.taskId },
        data: { status: restored },
      });
    }

    // A baseless ("rejected") dispute clears the agent — restore the reputation
    // the open penalty docked, so a dismissed dispute leaves no permanent mark.
    if (status === "rejected" && task?.sellerAgentId) {
      await onDisputeDismissed(task.sellerAgentId, dispute.taskId);
    }

    revalidateTask(dispute.taskId);
    return { ok: true };
  } catch (err) {
    console.error("resolveDispute failed", err);
    return { ok: false, error: "Could not resolve dispute." };
  }
}

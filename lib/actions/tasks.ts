"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { mockHash, safeJsonParse } from "@/lib/utils";
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
import {
  validateArtifactAgainstSchema,
  type ArtifactValidationResult,
} from "@/lib/validation";
import { notify } from "@/lib/notifications";
import { dispatchTaskWebhook } from "@/lib/webhooks";
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
  const res = await transition(taskId, ["pending"], "accepted");
  if (res.ok) {
    // Notification + webhook are side effects of a state change that already
    // succeeded — best-effort, wrapped so either failing can't roll it back
    // or surface as an error to the caller.
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { buyerId: true, title: true },
    });
    if (task) {
      try {
        await notify({
          userId: task.buyerId,
          type: "task_accepted",
          title: "Task accepted",
          body: `The agent accepted "${task.title}" and is ready to start.`,
          href: `/tasks/${taskId}`,
        });
      } catch (err) {
        console.error("notify(task_accepted) failed", err);
      }
    }
    try {
      await dispatchTaskWebhook(taskId);
    } catch (err) {
      console.error("dispatchTaskWebhook(task.assigned) failed", err);
    }
  }
  return res;
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

/**
 * Best-effort parse of artifact content into the value real schema validation
 * should check: the parsed JSON when the content is JSON, else the raw text
 * (a schema may legitimately expect a bare string), else `null` when there's
 * no inline content at all (e.g. a URL-only submission — there is no fetched
 * body to check structurally; fetching the URL server-side is out of scope
 * here and would reopen the SSRF surface validateArtifactUrl just closed).
 */
function parseArtifactContentForValidation(content: string | null | undefined): unknown {
  if (!content || !content.trim()) return null;
  const parsed = safeJsonParse(content);
  return parsed !== null ? parsed : content;
}

/**
 * Human-readable validation notes, mirroring the retired mock validator's
 * multi-line shape (lib/mockValidation.ts's `notes`) so the artifact card's
 * existing rendering stays familiar. The final line joins every schema
 * violation into one readable string.
 */
function buildValidationNotes(result: ArtifactValidationResult): string[] {
  if (result.skipped) {
    return ["No output schema on contract — submission skips schema validation."];
  }
  if (result.valid) {
    return [
      "Artifact present.",
      "Output schema found on contract — running schema validation.",
      "Schema validation passed — artifact conforms to the output schema.",
    ];
  }
  return [
    "Artifact present.",
    "Output schema found on contract — running schema validation.",
    `Schema validation failed: ${result.errors.join("; ")}`,
  ];
}

/**
 * Run real schema validation for one artifact and persist status + notes
 * (the same fields the old mock validator wrote). Shared by submitArtifact
 * (right after a fresh submission) and runValidation (manual re-check) so
 * the two paths can never disagree about what "valid" means.
 */
async function persistArtifactValidation(params: {
  artifactId: string;
  outputSchema: unknown;
  content: string | null;
}): Promise<ArtifactValidationResult> {
  const parsedContent = parseArtifactContentForValidation(params.content);
  const result = validateArtifactAgainstSchema(params.outputSchema, parsedContent);
  const notes = buildValidationNotes(result);

  await prisma.artifact.update({
    where: { id: params.artifactId },
    data: {
      validationStatus: result.valid ? "passed" : "failed",
      validationNotes: notes,
    },
  });

  return result;
}

export async function submitArtifact(
  taskId: string,
  values: unknown,
): Promise<
  ActionResult<{
    status: "submitted" | "validating";
    valid: boolean;
    skipped: boolean;
    errors: string[];
  }>
> {
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
      select: {
        status: true,
        buyerId: true,
        title: true,
        sellerAgentId: true,
        contract: { select: { outputSchema: true } },
      },
    });
    if (!task) return { ok: false, error: "Task not found." };
    if (!["accepted", "running", "submitted"].includes(task.status)) {
      return { ok: false, error: `Cannot submit an artifact for a ${task.status} task.` };
    }

    const artifact = await prisma.artifact.create({
      data: {
        taskId,
        title: input.title,
        type: input.type,
        url: input.url || null,
        content: input.content || null,
        validationStatus: "pending",
      },
    });

    // Real validation runs immediately — no separate "run validation" step.
    const outcome = await persistArtifactValidation({
      artifactId: artifact.id,
      outputSchema: task.contract?.outputSchema ?? null,
      content: artifact.content,
    });

    // A valid (or skipped — no schema declared) artifact clears straight to
    // buyer review ("validating" doubles as "awaiting buyer approval"). An
    // invalid artifact must NOT advance: the task stays "submitted" so the
    // agent can correct and resubmit — submitArtifact already accepts
    // "submitted" as a resubmission state, so this is not a dead end.
    const nextStatus: "submitted" | "validating" = outcome.valid ? "validating" : "submitted";
    await prisma.task.update({ where: { id: taskId }, data: { status: nextStatus } });

    // Feed the real pass/fail into the existing schema-compliance reputation
    // signal (previously driven by the mock's random score). Skipped checks
    // (no schema declared) have nothing real to attribute, so they don't fire.
    if (task.sellerAgentId && !outcome.skipped) {
      try {
        await onValidationComplete(task.sellerAgentId, taskId, outcome.valid ? 100 : 0);
      } catch (err) {
        console.error("onValidationComplete failed", err);
      }
    }

    try {
      await notify({
        userId: task.buyerId,
        type: outcome.valid ? "approval_needed" : "artifact_submitted",
        title: outcome.valid
          ? "Artifact ready for your approval"
          : "Artifact submitted — needs a fix",
        body: outcome.valid
          ? `"${task.title}" conforms to the contract. Review and approve to release payment.`
          : `"${task.title}": ${outcome.errors.slice(0, 2).join("; ") || "the submission did not pass validation"}.`,
        href: `/tasks/${taskId}`,
      });
    } catch (err) {
      console.error("notify(artifact_submitted) failed", err);
    }

    revalidateTask(taskId);
    return {
      ok: true,
      data: {
        status: nextStatus,
        valid: outcome.valid,
        skipped: outcome.skipped,
        errors: outcome.errors,
      },
    };
  } catch (err) {
    console.error("submitArtifact failed", err);
    return { ok: false, error: "Could not submit artifact." };
  }
}

/**
 * Manual re-check of the latest artifact. Kept for API compatibility
 * (POST /api/tasks/[id]/validate) — submitArtifact now runs validation
 * automatically, so this is mostly useful if a contract's schema changed
 * after submission. Backed by the same real validator + persistence helper
 * as submitArtifact, so it can no longer disagree with (or clobber) the
 * result already shown on the artifact card.
 */
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

    const outcome = await persistArtifactValidation({
      artifactId: artifact.id,
      outputSchema: task.contract?.outputSchema ?? null,
      content: artifact.content,
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { status: outcome.valid ? "validating" : "submitted" },
    });

    if (task.sellerAgentId && !outcome.skipped) {
      await onValidationComplete(task.sellerAgentId, task.id, outcome.valid ? 100 : 0);
    }

    revalidateTask(taskId);
    return {
      ok: true,
      data: { score: outcome.valid ? 100 : 0, status: outcome.valid ? "passed" : "failed" },
    };
  } catch (err) {
    console.error("runValidation failed", err);
    return { ok: false, error: "Validation failed to run." };
  }
}

/**
 * Shared completion core: release payment, credit reputation, notify the
 * seller, revalidate. completeTask and approveTask both funnel through this
 * so payment-release logic exists in exactly one place.
 */
async function finishTask(params: {
  taskId: string;
  title: string;
  sellerAgentId: string | null;
  sellerAgentOwnerId: string | null;
}): Promise<ActionResult> {
  await prisma.task.update({ where: { id: params.taskId }, data: { status: "completed" } });
  await releasePaymentForTask(params.taskId);

  if (params.sellerAgentId) {
    await onTaskCompleted(params.sellerAgentId, params.taskId);
  }

  if (params.sellerAgentOwnerId) {
    try {
      await notify({
        userId: params.sellerAgentOwnerId,
        type: "task_completed",
        title: "Task completed — payment released",
        body: `"${params.title}" was approved and payment has been released.`,
        href: `/tasks/${params.taskId}`,
      });
    } catch (err) {
      console.error("notify(task_completed) failed", err);
    }
  }

  revalidateTask(params.taskId);
  return { ok: true };
}

/**
 * Buyer approval — the one door out of "validating" (awaiting buyer review)
 * into "completed". This is the explicit-approval half of the trust core:
 * a valid artifact no longer auto-releases payment, a buyer must approve it.
 * Reuses finishTask (the same completion core) rather than duplicating
 * payment release / reputation / revalidation.
 *
 * Deliberately does NOT accept "submitted" as a from-state: under the new
 * validation flow "submitted" always means the latest artifact *failed* (a
 * passing or skipped one advances straight to "validating" — see
 * submitArtifact), so allowing completion from "submitted" would let payment
 * release without ever passing a real check. "validating" is the only door.
 */
export async function approveTask(taskId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        status: true,
        title: true,
        buyerId: true,
        sellerAgentId: true,
        sellerAgent: { select: { ownerId: true } },
      },
    });
    if (!task) return { ok: false, error: "Task not found." };
    if (user.role !== "admin" && task.buyerId !== user.id) {
      return { ok: false, error: "Only the buyer can approve this task." };
    }
    if (task.status !== "validating") {
      return { ok: false, error: `Cannot approve a ${task.status} task.` };
    }
    return await finishTask({
      taskId,
      title: task.title,
      sellerAgentId: task.sellerAgentId,
      sellerAgentOwnerId: task.sellerAgent?.ownerId ?? null,
    });
  } catch (err) {
    console.error("approveTask failed", err);
    return { ok: false, error: "Could not approve task." };
  }
}

/**
 * Kept for API compatibility (POST /api/tasks/[id]/complete predates buyer
 * approval and calls this directly) — now a thin alias for approveTask, not
 * a second gate with its own rules. It used to also accept "submitted" as a
 * from-state; that was the fake-validation-shaped hole this workstream
 * closes, so it's gone. Buyer-only, "validating" only, one completion path.
 */
export async function completeTask(taskId: string): Promise<ActionResult> {
  return approveTask(taskId);
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
      // Real validation just ran inline (no separate mock step to fake a
      // pass anymore) — read back where it actually landed rather than
      // assuming "validating".
      status = r.data?.status ?? "submitted";
    }
    if (status === "validating") {
      const r = await approveTask(taskId);
      if (!r.ok) return r;
    } else if (status === "submitted") {
      return {
        ok: false,
        error:
          "The demo artifact didn't pass this task's output schema. Try a task with a looser contract.",
      };
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
      select: {
        title: true,
        buyerId: true,
        sellerAgentId: true,
        sellerAgent: { select: { ownerId: true } },
      },
    });
    if (!task) return { ok: false, error: "Task not found." };

    await prisma.dispute.create({
      data: { taskId, openedById: user.id, reason: parsed.data.reason, status: "open" },
    });
    await prisma.task.update({ where: { id: taskId }, data: { status: "disputed" } });
    if (task.sellerAgentId) await onDisputeOpened(task.sellerAgentId, taskId);

    // Notify whichever side didn't open the dispute.
    const counterpartyId =
      user.id === task.sellerAgent?.ownerId ? task.buyerId : task.sellerAgent?.ownerId;
    if (counterpartyId) {
      try {
        await notify({
          userId: counterpartyId,
          type: "dispute_opened",
          title: "A dispute was opened",
          body: `"${task.title}": ${parsed.data.reason}`.slice(0, 200),
          href: `/tasks/${taskId}`,
        });
      } catch (err) {
        console.error("notify(dispute_opened) failed", err);
      }
    }

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

import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Outbound webhooks to seller agent endpoints — contract.
 *
 * Deliveries are signed with HMAC-SHA256 over the raw body using
 * WEBHOOK_SIGNING_SECRET (header: `x-bids-signature`, hex digest;
 * `x-bids-event` carries the event name). Up to 3 attempts with backoff;
 * every attempt updates the task's WebhookDelivery row so sellers can see
 * exactly what was sent, when, and what came back.
 *
 * Implementation owned by workstream A4 (webhook dispatch).
 */

export type TaskWebhookEvent = "task.assigned";

export interface TaskWebhookPayload {
  event: TaskWebhookEvent;
  task: {
    id: string;
    title: string;
    objective: string;
    category: string;
    budget: number;
    currency: string;
    deadline: string | null;
    input_payload: unknown;
    output_schema: unknown;
  };
  /** ISO timestamp of dispatch. */
  sent_at: string;
}

/** Attempt N is preceded by this wait (attempt 1 fires immediately). */
const ATTEMPT_DELAYS_MS = [0, 2000, 5000];
const MAX_ATTEMPTS = ATTEMPT_DELAYS_MS.length;
const REQUEST_TIMEOUT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * HMAC-SHA256 hex digest of a raw request body. Pure and side-effect free so
 * the signing scheme can be unit-tested without a server, network, or DB.
 */
export function signWebhookBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Fire-and-forget dispatch of a task event to the seller agent's endpointUrl.
 * No-op (recorded as skipped) when the agent has no endpoint. Never throws —
 * a dead endpoint must not break the task lifecycle that triggered it.
 */
export async function dispatchTaskWebhook(taskId: string): Promise<void> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { sellerAgent: true, contract: true },
    });

    const endpointUrl = task?.sellerAgent?.endpointUrl;
    if (!task || !endpointUrl) return;

    const payload: TaskWebhookPayload = {
      event: "task.assigned",
      task: {
        id: task.id,
        title: task.title,
        objective: task.objective,
        category: task.category,
        budget: task.budget,
        currency: task.currency,
        deadline: task.deadline ? task.deadline.toISOString() : null,
        input_payload: task.contract?.inputPayload ?? null,
        output_schema: task.contract?.outputSchema ?? null,
      },
      sent_at: new Date().toISOString(),
    };
    const body = JSON.stringify(payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-bids-event": payload.event,
    };
    const secret = process.env.WEBHOOK_SIGNING_SECRET;
    if (secret) {
      // Unsigned delivery (no secret configured) is acceptable — never send
      // a fabricated signature.
      headers["x-bids-signature"] = signWebhookBody(body, secret);
    }

    const delivery = await prisma.webhookDelivery.create({
      data: {
        event: payload.event,
        url: endpointUrl,
        status: "pending",
        taskId: task.id,
      },
    });

    let attempts = 0;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const delay = ATTEMPT_DELAYS_MS[i] ?? 0;
      if (delay > 0) await sleep(delay);
      attempts += 1;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(endpointUrl, {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        });

        if (res.ok) {
          await prisma.webhookDelivery.update({
            where: { id: delivery.id },
            data: { status: "success", attempts, responseStatus: res.status },
          });
          return;
        }

        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            attempts,
            responseStatus: res.status,
            lastError: `Endpoint responded ${res.status} ${res.statusText}`.trim(),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.webhookDelivery.update({
          where: { id: delivery.id },
          data: { attempts, lastError: message },
        });
      } finally {
        clearTimeout(timer);
      }
    }

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: { status: "failed" },
    });
  } catch (err) {
    // Never throw: a dead/misconfigured endpoint, or even a DB hiccup while
    // recording the attempt, must not break the task lifecycle that
    // triggered this dispatch.
    console.error("[dispatchTaskWebhook] delivery failed", err);
  }
}

import "server-only";

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

/**
 * Fire-and-forget dispatch of a task event to the seller agent's endpointUrl.
 * No-op (recorded as skipped) when the agent has no endpoint. Never throws —
 * a dead endpoint must not break the task lifecycle that triggered it.
 */
export async function dispatchTaskWebhook(taskId: string): Promise<void> {
  throw new Error("not implemented — workstream A4");
}

import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * In-app notifications — contract.
 *
 * One row per recipient per event, written inside the action that caused it.
 * Never throws — a failed notification insert must not break the mutation
 * that triggered it.
 *
 * Implementation owned by workstream A5 (notifications).
 */

export type NotificationType =
  | "task_accepted"
  | "artifact_submitted"
  | "approval_needed"
  | "task_completed"
  | "dispute_opened"
  | "invite_received";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  /** In-app destination, e.g. `/tasks/abc123`. */
  href?: string;
}

/** Persist a notification for one user. Best-effort; errors are logged. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
      },
    });
  } catch (err) {
    console.error("notify failed", err);
  }
}

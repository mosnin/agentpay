"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

/** Mark one of the current user's own notifications read (no-op if already read). */
export async function markNotificationRead(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const existing = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true, readAt: true },
    });
    if (!existing) return { ok: false, error: "Notification not found." };
    if (existing.userId !== user.id) {
      return { ok: false, error: "You can only update your own notifications." };
    }

    if (!existing.readAt) {
      await prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }
    return { ok: true };
  } catch (err) {
    console.error("markNotificationRead failed", err);
    return { ok: false, error: "Could not update notification." };
  }
}

/** Mark all of the current user's unread notifications read. */
export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  } catch (err) {
    console.error("markAllNotificationsRead failed", err);
    return { ok: false, error: "Could not update notifications." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-keys";
import type { ActionResult } from "@/lib/types";

/** Active-key ceiling per user — keeps the settings list (and blast radius) bounded. */
const MAX_ACTIVE_KEYS = 10;

export async function createApiKey(
  name: string,
): Promise<ActionResult<{ secret: string; prefix: string }>> {
  const trimmed = (name ?? "").trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    return { ok: false, error: "Name must be between 2 and 60 characters." };
  }

  try {
    const user = await requireUser();

    const activeCount = await prisma.apiKey.count({
      where: { userId: user.id, revokedAt: null },
    });
    if (activeCount >= MAX_ACTIVE_KEYS) {
      return {
        ok: false,
        error: `You've reached the limit of ${MAX_ACTIVE_KEYS} active API keys. Revoke one before creating another.`,
      };
    }

    const { secret, prefix, hashedKey } = generateApiKey();
    await prisma.apiKey.create({
      data: { name: trimmed, prefix, hashedKey, userId: user.id },
    });

    revalidatePath("/settings/api-keys");
    // Secret is returned exactly once — only the hash is ever persisted.
    return { ok: true, data: { secret, prefix } };
  } catch (err) {
    console.error("createApiKey failed", err);
    return { ok: false, error: "Could not create API key. Please try again." };
  }
}

export async function revokeApiKey(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const existing = await prisma.apiKey.findUnique({
      where: { id },
      select: { userId: true, revokedAt: true },
    });
    if (!existing) return { ok: false, error: "API key not found." };
    if (existing.userId !== user.id) {
      return { ok: false, error: "You can only revoke keys you own." };
    }
    if (existing.revokedAt) {
      return { ok: true }; // already revoked — no-op success
    }

    await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    revalidatePath("/settings/api-keys");
    return { ok: true };
  } catch (err) {
    console.error("revokeApiKey failed", err);
    return { ok: false, error: "Could not revoke API key." };
  }
}

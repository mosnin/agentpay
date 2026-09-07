"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateApiKey, type ApiScope } from "@/lib/api-keys";
import type { ActionResult } from "@/lib/types";

/** Active-key ceiling per user — keeps the settings list (and blast radius) bounded. */
const MAX_ACTIVE_KEYS = 10;

export async function createApiKey(
  name: string,
  profile: "worker" | "reader" | "account" = "worker",
  lifetimeDays: number = 90,
): Promise<ActionResult<{ secret: string; prefix: string }>> {
  const trimmed = (name ?? "").trim();
  if (trimmed.length < 2 || trimmed.length > 60) {
    return { ok: false, error: "Name must be between 2 and 60 characters." };
  }

  if (
    !["worker", "reader", "account"].includes(profile) ||
    ![7, 30, 90].includes(lifetimeDays)
  )
    return {
      ok: false,
      error: "Choose a valid permission profile and expiry.",
    };
  try {
    const user = await requireUser();

    const { secret, prefix, hashedKey } = generateApiKey();
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      const activeCount = await tx.apiKey.count({
        where: {
          userId: user.id,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (activeCount >= MAX_ACTIVE_KEYS)
        throw new Error("Active key limit reached. Revoke a key first.");
      const scopes: ApiScope[] =
        profile === "account"
          ? ["account"]
          : profile === "reader"
            ? ["tasks:read"]
            : ["tasks:read", "tasks:execute", "agents:write"];
      await tx.apiKey.create({
        data: {
          name: trimmed,
          prefix,
          hashedKey,
          userId: user.id,
          scopes,
          expiresAt: new Date(Date.now() + lifetimeDays * 86400000),
        },
      });
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

    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    revalidatePath("/settings/api-keys");
    return { ok: true };
  } catch (err) {
    console.error("revokeApiKey failed", err);
    return { ok: false, error: "Could not revoke API key." };
  }
}

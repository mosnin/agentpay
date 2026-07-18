import "server-only";
import { randomBytes, createHash } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * API keys for headless agents — contract.
 *
 * Key format: `bids_<40 hex chars>`. The full secret is returned exactly once
 * at creation; only a SHA-256 hash is persisted (constant-time comparison on
 * verify). `prefix` stores the first 12 characters for display ("bids_ab12…").
 *
 * Implementation owned by workstream A1 (api-key core).
 */

export interface GeneratedKey {
  /** Full secret, shown once. */
  secret: string;
  /** Display fragment persisted alongside the hash. */
  prefix: string;
  /** SHA-256 hex digest of the secret. */
  hashedKey: string;
}

/** Generate a new key triple. Pure — no database access. */
export function generateApiKey(): GeneratedKey {
  const secret = `bids_${randomBytes(20).toString("hex")}`;
  const prefix = secret.slice(0, 12);
  return { secret, prefix, hashedKey: hashApiKey(secret) };
}

/** Hash a presented secret for lookup (SHA-256 hex). */
export function hashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/**
 * Resolve the user behind a bearer secret. Returns null for unknown,
 * revoked, or malformed keys. Updates lastUsedAt (best-effort, non-blocking).
 */
export async function resolveApiKeyUser(secret: string): Promise<User | null> {
  // Fail fast on anything that isn't shaped like one of ours — skips a hash +
  // query for obviously-foreign bearer tokens (e.g. a Clerk JWT).
  if (!secret.startsWith("bids_")) return null;

  const apiKey = await prisma.apiKey.findUnique({
    where: { hashedKey: hashApiKey(secret) },
    include: { user: true },
  });
  if (!apiKey || apiKey.revokedAt) return null;

  // Best-effort — must never block or fail the resolution it's piggybacking on.
  void prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch((err) => console.error("Failed to update apiKey.lastUsedAt", err));

  return apiKey.user;
}

import "server-only";
import type { User } from "@prisma/client";

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
  throw new Error("not implemented — workstream A1");
}

/** Hash a presented secret for lookup (SHA-256 hex). */
export function hashApiKey(secret: string): string {
  throw new Error("not implemented — workstream A1");
}

/**
 * Resolve the user behind a bearer secret. Returns null for unknown,
 * revoked, or malformed keys. Updates lastUsedAt (best-effort, non-blocking).
 */
export async function resolveApiKeyUser(secret: string): Promise<User | null> {
  throw new Error("not implemented — workstream A1");
}

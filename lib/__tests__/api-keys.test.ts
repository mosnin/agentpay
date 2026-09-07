import { describe, it, expect, vi } from "vitest";

// lib/api-keys.ts is a server-only module: it starts with `import "server-only"`
// (which throws when resolved outside a "react-server" bundler condition) and
// imports the real Prisma client at module scope (which requires a live
// datasource). Neither concern applies to the pure generate/hash helpers under
// test here, so both are stubbed before importing the module below — `vi.mock`
// calls are hoisted above imports, so this runs before `@/lib/api-keys` (and
// its imports) ever evaluate. resolveApiKeyUser() (the DB-backed half of this
// contract) is intentionally not exercised here — see mission scope.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { generateApiKey, hashApiKey } from "@/lib/api-keys";

describe("generateApiKey", () => {
  it("produces a secret shaped bids_<40 hex chars>", () => {
    const { secret } = generateApiKey();
    expect(secret).toMatch(/^bids_[0-9a-f]{40}$/);
  });

  it("derives the prefix as the first 12 characters of the full secret", () => {
    const { secret, prefix } = generateApiKey();
    expect(prefix).toHaveLength(12);
    expect(prefix).toBe(secret.slice(0, 12));
    expect(secret.startsWith(prefix)).toBe(true);
  });

  it("hashes the secret to a 64-char lowercase hex digest (SHA-256)", () => {
    const { hashedKey } = generateApiKey();
    expect(hashedKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps hashedKey consistent with hashApiKey(secret)", () => {
    const { secret, hashedKey } = generateApiKey();
    expect(hashApiKey(secret)).toBe(hashedKey);
  });

  it("generates unique secrets (and hashes) across calls", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.secret).not.toBe(b.secret);
    expect(a.prefix).not.toBe(b.prefix);
    expect(a.hashedKey).not.toBe(b.hashedKey);
  });
});

describe("hashApiKey", () => {
  it("is deterministic for the same input", () => {
    expect(hashApiKey("bids_abc123")).toBe(hashApiKey("bids_abc123"));
  });

  it("produces different digests for different secrets", () => {
    expect(hashApiKey("bids_abc123")).not.toBe(hashApiKey("bids_xyz789"));
  });

  it("returns a 64-char lowercase hex digest (SHA-256)", () => {
    expect(hashApiKey("bids_abc123")).toMatch(/^[0-9a-f]{64}$/);
  });
});

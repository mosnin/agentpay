import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// lib/verification.ts is a server-only module (`import "server-only"`, plus
// a live Prisma client at module scope via lib/prisma, lib/reputation, and
// lib/webhooks). None of that applies to the pure/network-mockable surface
// under test here, so both are stubbed before importing the module below —
// `vi.mock` calls are hoisted above imports, so this runs before
// `@/lib/verification` (and its transitive imports) ever evaluate. Mirrors
// the exact pattern lib/__tests__/webhooks.test.ts uses.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  generateVerificationNonce,
  signVerificationChallenge,
  aggregateVerificationChecks,
  runHealthCheck,
  runSchemaCheck,
  runIdentityCheck,
  isSkippedCheckDetail,
  type VerificationCheckResult,
} from "@/lib/verification";
import { signWebhookBody } from "@/lib/webhooks";

// ---------------------------------------------------------------------------
// Pure signing / nonce helpers
// ---------------------------------------------------------------------------

describe("generateVerificationNonce", () => {
  it("returns a 32-character lowercase hex string (16 random bytes)", () => {
    expect(generateVerificationNonce()).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns a different value on successive calls", () => {
    expect(generateVerificationNonce()).not.toBe(generateVerificationNonce());
  });
});

describe("signVerificationChallenge", () => {
  it("matches the RFC 4231 HMAC-SHA256 test vector #2 (key 'Jefe')", () => {
    expect(signVerificationChallenge("what do ya want for nothing?", "Jefe")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  it("is deterministic for the same nonce and secret", () => {
    expect(signVerificationChallenge("nonce-1", "secret-1")).toBe(
      signVerificationChallenge("nonce-1", "secret-1"),
    );
  });

  it("produces a 64-character lowercase hex digest", () => {
    expect(signVerificationChallenge("nonce-1", "secret-1")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs when the nonce differs", () => {
    expect(signVerificationChallenge("nonce-1", "secret-1")).not.toBe(
      signVerificationChallenge("nonce-2", "secret-1"),
    );
  });

  it("differs when the secret differs", () => {
    expect(signVerificationChallenge("nonce-1", "secret-1")).not.toBe(
      signVerificationChallenge("nonce-1", "secret-2"),
    );
  });
});

describe("isSkippedCheckDetail", () => {
  it("recognizes the skipped-detail prefix", () => {
    expect(isSkippedCheckDetail("Skipped — agent declares no output schema.")).toBe(true);
  });

  it("is false for a genuine pass or fail detail", () => {
    expect(isSkippedCheckDetail("Declared output schema compiles.")).toBe(false);
    expect(isSkippedCheckDetail("No endpoint to verify.")).toBe(false);
  });

  it("is false for null/undefined", () => {
    expect(isSkippedCheckDetail(null)).toBe(false);
    expect(isSkippedCheckDetail(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Aggregation logic — pure, no database required.
// ---------------------------------------------------------------------------

function check(overrides: Partial<VerificationCheckResult>): VerificationCheckResult {
  return { kind: "health", passed: true, skipped: false, detail: "ok", ...overrides };
}

describe("aggregateVerificationChecks", () => {
  it("verifies when every required check passes", () => {
    const result = aggregateVerificationChecks([
      check({ kind: "health", passed: true }),
      check({ kind: "schema", passed: true }),
      check({ kind: "identity", passed: true }),
    ]);
    expect(result).toEqual({ verified: true, verificationStatus: "verified", verificationError: null });
  });

  it("verifies when a skipped check is mixed in with passing required checks", () => {
    const result = aggregateVerificationChecks([
      check({ kind: "health", passed: true }),
      check({ kind: "schema", passed: true, skipped: true, detail: "Skipped — no schema." }),
      check({ kind: "identity", passed: true }),
    ]);
    expect(result.verified).toBe(true);
    expect(result.verificationStatus).toBe("verified");
  });

  it("fails when one required check fails, with a concise error naming it", () => {
    const result = aggregateVerificationChecks([
      check({ kind: "health", passed: false, detail: "No endpoint to verify." }),
      check({ kind: "schema", passed: true }),
      check({ kind: "identity", passed: true }),
    ]);
    expect(result.verified).toBe(false);
    expect(result.verificationStatus).toBe("failed");
    expect(result.verificationError).toContain("Health:");
    expect(result.verificationError).toContain("No endpoint to verify.");
    expect(result.verificationError).not.toContain("Schema:");
    expect(result.verificationError).not.toContain("Identity:");
  });

  it("names every failing check when more than one fails", () => {
    const result = aggregateVerificationChecks([
      check({ kind: "health", passed: false, detail: "Endpoint down." }),
      check({ kind: "schema", passed: true }),
      check({ kind: "identity", passed: false, detail: "No email on file." }),
    ]);
    expect(result.verificationError).toContain("Health:");
    expect(result.verificationError).toContain("Endpoint down.");
    expect(result.verificationError).toContain("Identity:");
    expect(result.verificationError).toContain("No email on file.");
  });

  it("does not let a skipped check's own passed:true count toward failure OR success on its own", () => {
    // Defensive edge case: if every check were somehow skipped, there is no
    // required check to have actually passed, so this must not verify.
    const result = aggregateVerificationChecks([
      check({ kind: "health", passed: true, skipped: true, detail: "Skipped — n/a" }),
    ]);
    expect(result.verified).toBe(false);
    expect(result.verificationStatus).toBe("failed");
  });
});

// ---------------------------------------------------------------------------
// runHealthCheck — fetch is mocked; no real network access.
// ---------------------------------------------------------------------------

describe("runHealthCheck", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fails honestly when the agent has no endpoint — and never calls fetch", async () => {
    const result = await runHealthCheck(null);
    expect(result).toMatchObject({ kind: "health", passed: false, skipped: false });
    expect(result.detail).toMatch(/no endpoint/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fails when the endpoint responds with a non-2xx status", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, statusText: "Service Unavailable" });
    const result = await runHealthCheck("https://agent.example.com/challenge");
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("503");
  });

  it("fails when the response body is not valid JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => {
        throw new SyntaxError("Unexpected token");
      },
    });
    const result = await runHealthCheck("https://agent.example.com/challenge");
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/not valid json/i);
  });

  it("fails when the response does not echo the challenge nonce", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ nonce: "wrong-nonce" }),
    });
    const result = await runHealthCheck("https://agent.example.com/challenge");
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/did not echo/i);
  });

  it("fails on network/DNS errors with the error message surfaced", async () => {
    mockFetch.mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND agent.example.com"));
    const result = await runHealthCheck("https://agent.example.com/challenge");
    expect(result.passed).toBe(false);
    expect(result.detail).toContain("ENOTFOUND");
  });

  it("fails with a timeout-specific message on abort", async () => {
    mockFetch.mockImplementationOnce(() => {
      const err = new Error("This operation was aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });
    const result = await runHealthCheck("https://agent.example.com/challenge");
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/did not respond within/i);
  });

  it("passes on a correct nonce echo when no VERIFICATION_SECRET is configured, and says unsigned", async () => {
    vi.stubEnv("VERIFICATION_SECRET", "");
    let capturedNonce = "";
    mockFetch.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      capturedNonce = body.nonce;
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ nonce: capturedNonce }) };
    });
    const result = await runHealthCheck("https://agent.example.com/challenge");
    expect(result.passed).toBe(true);
    expect(result.detail).toMatch(/unsigned/i);

    // No secret configured -> no outgoing signature header either (never
    // fabricate one it can't compute).
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["x-bids-signature"]).toBeUndefined();
  });

  it("passes when VERIFICATION_SECRET is set and the endpoint returns a matching HMAC", async () => {
    vi.stubEnv("VERIFICATION_SECRET", "shared-secret");
    mockFetch.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const signature = signVerificationChallenge(body.nonce, "shared-secret");
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ nonce: body.nonce, signature }),
      };
    });
    const result = await runHealthCheck("https://agent.example.com/challenge");
    expect(result.passed).toBe(true);
    expect(result.detail).toMatch(/valid hmac/i);

    // The outgoing request itself must also be signed with the same secret,
    // over exactly the body that was sent (same style as lib/webhooks.ts).
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["x-bids-signature"]).toBe(signWebhookBody(String(init.body), "shared-secret"));
  });

  it("fails when VERIFICATION_SECRET is set and the endpoint returns a wrong signature", async () => {
    vi.stubEnv("VERIFICATION_SECRET", "shared-secret");
    mockFetch.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ nonce: body.nonce, signature: "0".repeat(64) }),
      };
    });
    const result = await runHealthCheck("https://agent.example.com/challenge");
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/signature did not match/i);
  });
});

// ---------------------------------------------------------------------------
// runSchemaCheck — pure given its input; exercises the real ajv validator.
// ---------------------------------------------------------------------------

describe("runSchemaCheck", () => {
  it("is skipped honestly when the agent declares no output schema", async () => {
    const result = await runSchemaCheck(null);
    expect(result).toMatchObject({ kind: "schema", passed: true, skipped: true });
    expect(isSkippedCheckDetail(result.detail)).toBe(true);
  });

  it("is skipped honestly for an empty-object schema", async () => {
    const result = await runSchemaCheck({});
    expect(result.skipped).toBe(true);
  });

  it("passes a real, compilable JSON Schema", async () => {
    const result = await runSchemaCheck({
      type: "object",
      required: ["summary"],
      properties: { summary: { type: "string" }, confidence: { type: "number" } },
    });
    expect(result.passed).toBe(true);
    expect(result.skipped).toBe(false);
  });

  it("passes a lightweight 'shape hint' schema (not real JSON Schema keywords)", async () => {
    // Matches how most outputSchema values in this app actually look (see
    // lib/validation.ts's file header) — strict:false makes these compile
    // to an always-matching validator, which is what this check confirms.
    const result = await runSchemaCheck({ summary: "string", confidence: "number" });
    expect(result.passed).toBe(true);
  });

  it("fails a schema that does not compile (unresolvable $ref)", async () => {
    const result = await runSchemaCheck({ $ref: "#/definitions/doesNotExist" });
    expect(result.passed).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.detail).toMatch(/invalid output schema/i);
  });

  it("passes even when the synthetic sample would not itself satisfy every constraint", async () => {
    // A strict enum a generic synthetic sample can't guess correctly — this
    // check is about compilability, not about this sample validating.
    const result = await runSchemaCheck({
      type: "object",
      properties: { status: { type: "string", enum: ["approved", "rejected"] } },
      required: ["status"],
    });
    expect(result.passed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// runIdentityCheck — pure given its input.
// ---------------------------------------------------------------------------

describe("runIdentityCheck", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails when there is no owner", async () => {
    const result = await runIdentityCheck(null);
    expect(result.passed).toBe(false);
  });

  it("fails when the owner has no email on file", async () => {
    const result = await runIdentityCheck({ email: "", clerkId: null });
    expect(result.passed).toBe(false);
    expect(result.detail).toMatch(/no email/i);
  });

  it("passes on email alone when Clerk is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    const result = await runIdentityCheck({ email: "owner@example.com", clerkId: null });
    expect(result.passed).toBe(true);
  });

  it("requires a linked Clerk identity when this deployment runs with Clerk configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_123");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_123");
    const withoutClerk = await runIdentityCheck({ email: "owner@example.com", clerkId: null });
    expect(withoutClerk.passed).toBe(false);
    expect(withoutClerk.detail).toMatch(/signed-in account/i);

    const withClerk = await runIdentityCheck({ email: "owner@example.com", clerkId: "user_123" });
    expect(withClerk.passed).toBe(true);
  });

  it("never includes the owner's email in the detail text (public-profile safe)", async () => {
    const result = await runIdentityCheck({ email: "owner@example.com", clerkId: null });
    expect(result.detail).not.toContain("owner@example.com");
  });
});

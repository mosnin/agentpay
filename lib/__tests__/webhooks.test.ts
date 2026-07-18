import { describe, it, expect, vi } from "vitest";

// lib/webhooks.ts is a server-only module: it starts with `import "server-only"`
// (which throws when resolved outside a "react-server" bundler condition) and
// imports the real Prisma client at module scope (which requires a live
// datasource). Neither concern applies to the pure signing helper under test
// here, so both are stubbed before importing the module below — `vi.mock`
// calls are hoisted above imports, so this runs before `@/lib/webhooks` (and
// its imports) ever evaluate. This keeps the test free of any DB/network
// side effects, per the "signature computation only" scope of this file.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { signWebhookBody } from "@/lib/webhooks";

describe("signWebhookBody", () => {
  it("matches the RFC 4231 HMAC-SHA256 test vector #2 (key 'Jefe')", () => {
    expect(signWebhookBody("what do ya want for nothing?", "Jefe")).toBe(
      "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
    );
  });

  it("matches a known digest for a task-payload-shaped body", () => {
    const body = JSON.stringify({ event: "task.assigned", task: { id: "t1" } });
    expect(signWebhookBody(body, "whsec_test")).toBe(
      "7bbf752ff4b10b8322c405caf5d5c799f0fd22e944f6fbb641f53f8acd2d59c7",
    );
  });

  it("is deterministic for the same body and secret", () => {
    const body = JSON.stringify({ a: 1, b: "two" });
    expect(signWebhookBody(body, "secret-1")).toBe(signWebhookBody(body, "secret-1"));
  });

  it("produces a 64-character lowercase hex digest", () => {
    const sig = signWebhookBody(JSON.stringify({ a: 1 }), "secret-1");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs when the secret differs", () => {
    const body = JSON.stringify({ a: 1 });
    expect(signWebhookBody(body, "secret-1")).not.toBe(
      signWebhookBody(body, "secret-2"),
    );
  });

  it("differs when the body differs", () => {
    const secret = "secret-1";
    expect(signWebhookBody(JSON.stringify({ a: 1 }), secret)).not.toBe(
      signWebhookBody(JSON.stringify({ a: 2 }), secret),
    );
  });

  it("differs even for a single-character body change", () => {
    const secret = "secret-1";
    expect(signWebhookBody("abc", secret)).not.toBe(signWebhookBody("abd", secret));
  });
});

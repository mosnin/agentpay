import { describe, it, expect } from "vitest";
import {
  createPaymentRequirement,
  verifyPayment,
  releasePayment,
  isLive,
} from "@/lib/payments/x402Adapter";

describe("createPaymentRequirement", () => {
  it("builds a requirement with sensible defaults and a deterministic nonce", () => {
    const r = createPaymentRequirement({ taskId: "task_1", amount: 25 });
    expect(r.amount).toBe(25);
    expect(r.currency).toBe("USD");
    expect(r.scheme).toBe("exact");
    expect(r.resource).toBe("/api/tasks/task_1");
    expect(r.nonce).toBe(
      createPaymentRequirement({ taskId: "task_1", amount: 25 }).nonce,
    );
  });
});

describe("verifyPayment", () => {
  it("accepts non-negative amounts and rejects negatives", async () => {
    expect((await verifyPayment({ taskId: "t", amount: 0 })).valid).toBe(true);
    const bad = await verifyPayment({ taskId: "t", amount: -1 });
    expect(bad.valid).toBe(false);
    expect(bad.reason).toBeTruthy();
  });
});

describe("releasePayment", () => {
  it("returns a deterministic receipt for the same task + amount", async () => {
    const a = await releasePayment({ taskId: "task_1", amount: 25 });
    const b = await releasePayment({ taskId: "task_1", amount: 25 });
    expect(a.success).toBe(true);
    expect(a.transactionHash).toBe(b.transactionHash);
    expect(a.amount).toBe(25);
    expect(a.currency).toBe("USD");
  });
});

describe("isLive", () => {
  it("is false without x402 credentials configured", () => {
    expect(isLive()).toBe(false);
  });
});

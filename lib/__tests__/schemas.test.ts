import { describe, it, expect } from "vitest";
import {
  createAgentSchema,
  createTaskSchema,
  reviewSchema,
  submitArtifactSchema,
  disputeSchema,
  apiCreateTaskSchema,
} from "@/lib/schemas";

describe("createAgentSchema", () => {
  const valid = {
    name: "Lead Scorer X",
    shortDescription: "Scores inbound leads against your ICP.",
    longDescription:
      "Scores inbound leads against your ICP and routes the hottest ones to sales.",
    category: "Growth",
    capabilities: ["lead scoring"],
    pricingModel: "per_task",
    startingPrice: 10,
  };

  it("accepts a valid agent and applies defaults", () => {
    const r = createAgentSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.currency).toBe("USD");
      expect(r.data.verified).toBe(false);
    }
  });

  it("coerces a numeric string price", () => {
    const r = createAgentSchema.safeParse({ ...valid, startingPrice: "25" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.startingPrice).toBe(25);
  });

  it("rejects a too-short name, empty capabilities, and a bad URL", () => {
    expect(createAgentSchema.safeParse({ ...valid, name: "ab" }).success).toBe(false);
    expect(createAgentSchema.safeParse({ ...valid, capabilities: [] }).success).toBe(false);
    expect(
      createAgentSchema.safeParse({ ...valid, endpointUrl: "not-a-url" }).success,
    ).toBe(false);
    expect(
      createAgentSchema.safeParse({ ...valid, inputSchema: "{not json" }).success,
    ).toBe(false);
  });

  it("rejects an unknown category", () => {
    expect(createAgentSchema.safeParse({ ...valid, category: "Bogus" }).success).toBe(false);
  });

  it("accepts a valid JSON string for inputSchema", () => {
    const r = createAgentSchema.safeParse({ ...valid, inputSchema: '{"type":"object"}' });
    expect(r.success).toBe(true);
  });
});

describe("createTaskSchema", () => {
  const valid = {
    title: "Enrich leads",
    objective: "Enrich 500 leads with verified founder emails.",
    category: "Growth",
    sellerAgentId: "agent_1",
    budget: 25,
    paymentMode: "mock_escrow",
  };

  it("accepts a valid task and defaults visibility to public", () => {
    const r = createTaskSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.visibility).toBe("public");
  });

  it("rejects missing agent, short objective, and bad payment mode", () => {
    expect(createTaskSchema.safeParse({ ...valid, sellerAgentId: "" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...valid, objective: "short" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...valid, paymentMode: "free" }).success).toBe(false);
  });

  it("rejects an unknown category and a negative budget", () => {
    expect(createTaskSchema.safeParse({ ...valid, category: "Bogus" }).success).toBe(false);
    expect(createTaskSchema.safeParse({ ...valid, budget: -5 }).success).toBe(false);
  });
});

describe("reviewSchema", () => {
  it("accepts ratings 1..5 (coerced) and rejects out-of-range / non-integer", () => {
    expect(reviewSchema.safeParse({ rating: 5 }).success).toBe(true);
    expect(reviewSchema.safeParse({ rating: "4" }).success).toBe(true);
    expect(reviewSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: 3.5 }).success).toBe(false);
  });
});

describe("submitArtifactSchema", () => {
  it("accepts content or url and defaults type to json", () => {
    const r = submitArtifactSchema.safeParse({ title: "Result", content: "ok" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.type).toBe("json");
    expect(
      submitArtifactSchema.safeParse({ title: "Result", url: "https://x.com" }).success,
    ).toBe(true);
  });

  it("rejects a short title, bad type, and bad url", () => {
    expect(submitArtifactSchema.safeParse({ title: "a" }).success).toBe(false);
    expect(
      submitArtifactSchema.safeParse({ title: "Result", type: "zip" }).success,
    ).toBe(false);
    expect(
      submitArtifactSchema.safeParse({ title: "Result", url: "nope" }).success,
    ).toBe(false);
  });
});

describe("disputeSchema", () => {
  it("requires a reason of at least 10 characters", () => {
    expect(disputeSchema.safeParse({ reason: "This artifact is incomplete." }).success).toBe(true);
    expect(disputeSchema.safeParse({ reason: "short" }).success).toBe(false);
  });
});

describe("apiCreateTaskSchema", () => {
  it("accepts a minimal objective and applies API defaults", () => {
    const r = apiCreateTaskSchema.safeParse({ objective: "Do something useful" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.category).toBe("Growth");
      expect(r.data.budget).toBe(0);
      expect(r.data.payment_mode).toBe("mock_escrow");
    }
  });

  it("rejects an objective shorter than 3 characters", () => {
    expect(apiCreateTaskSchema.safeParse({ objective: "ab" }).success).toBe(false);
  });
});

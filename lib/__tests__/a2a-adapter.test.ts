import { describe, it, expect } from "vitest";
import {
  getAgentCard,
  parseArtifactMessage,
  createTaskMessage,
} from "@/lib/interop/a2aAdapter";

const agent = {
  id: "agent_1",
  name: "Growth Research Agent",
  category: "Growth",
  verified: true,
  reputationScore: 94,
  completionRate: 0.98,
  disputeRate: 0.01,
  schemaComplianceScore: 96,
  pricingModel: "per_task",
  startingPrice: 25,
  currency: "USD",
  endpointUrl: "https://example.com/agent",
  mcpServerUrl: null,
  capabilities: [
    { capability: { name: "Lead research", slug: "lead_research" } },
    { capability: { name: "Market scan", slug: "market_scan" } },
  ],
};

describe("getAgentCard", () => {
  it("maps an agent to a machine-readable A2A card", () => {
    const card = getAgentCard(agent);
    expect(card.agent_id).toBe("agent_1");
    expect(card.name).toBe("Growth Research Agent");
    expect(card.capabilities).toEqual(["lead_research", "market_scan"]);
    expect(card.pricing).toMatchObject({
      model: "per_task",
      starting_price: 25,
      currency: "USD",
    });
    expect(card.trust).toMatchObject({ verified: true, reputation_score: 94 });
    expect(card.endpoint).toMatchObject({
      url: "https://example.com/agent",
      mcp_server: null,
    });
  });

  it("defaults missing schemas to empty objects", () => {
    const card = getAgentCard(agent);
    expect(card.input_schema).toEqual({});
    expect(card.output_schema).toEqual({});
  });
});

describe("parseArtifactMessage", () => {
  it("reads a well-formed artifact message (stringifying object content)", () => {
    const a = parseArtifactMessage({
      title: "Result",
      type: "json",
      content: { ok: true },
      url: "https://x",
    });
    expect(a.title).toBe("Result");
    expect(a.type).toBe("json");
    expect(a.url).toBe("https://x");
    expect(typeof a.content).toBe("string");
  });

  it("falls back to safe defaults for empty input", () => {
    const a = parseArtifactMessage({});
    expect(a.title).toBe("Artifact");
    expect(a.type).toBe("json");
    expect(a.content).toBeNull();
    expect(a.url).toBeNull();
  });
});

describe("createTaskMessage", () => {
  it("wraps a task in an A2A request envelope", () => {
    const msg = createTaskMessage({
      id: "task_1",
      objective: "Do the thing",
      sellerAgentId: "agent_1",
      buyerEmail: "buyer@example.com",
      budget: 25,
      currency: "USD",
    });
    expect(msg.protocol).toBe("a2a/0.1");
    expect(msg.type).toBe("task.request");
    expect(msg.task_id).toBe("task_1");
    expect(msg.to_agent).toBe("agent_1");
    expect(msg.budget).toMatchObject({ amount: 25, currency: "USD" });
    expect(typeof msg.created_at).toBe("string");
  });
});

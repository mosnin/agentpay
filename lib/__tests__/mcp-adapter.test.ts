import { describe, it, expect } from "vitest";
import { listToolsForAgent, validateMcpServer } from "@/lib/interop/mcpAdapter";

const agent = {
  name: "Growth Research Agent",
  capabilities: [
    { capability: { name: "Lead research", slug: "lead-research" } },
    { capability: { name: "Market scan", slug: "market_scan" } },
  ],
};

describe("listToolsForAgent", () => {
  it("derives one well-formed tool per capability (slugs normalized to snake_case)", () => {
    const tools = listToolsForAgent(agent);
    expect(tools).toHaveLength(2);
    const [lead, market] = tools;
    expect(lead?.name).toBe("lead_research");
    expect(market?.name).toBe("market_scan");
    expect(lead?.description).toContain("Lead research");
    expect(lead?.description).toContain("Growth Research Agent");
    expect(lead?.inputSchema.type).toBe("object");
    expect(lead?.inputSchema.required).toEqual(["input"]);
    expect(Object.keys(lead?.inputSchema.properties ?? {})).toContain("input");
  });

  it("is deterministic", () => {
    expect(listToolsForAgent(agent)).toEqual(listToolsForAgent(agent));
  });
});

describe("validateMcpServer", () => {
  it("reports no server when the URL is missing", async () => {
    const r = await validateMcpServer(null);
    expect(r.valid).toBe(false);
    expect(r.reachable).toBe(false);
    expect(r.tools).toBe(0);
    expect(r.message).toMatch(/no mcp server/i);
  });

  it("rejects a malformed URL", async () => {
    const r = await validateMcpServer("not a url");
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/invalid/i);
  });

  it("accepts a well-formed https URL (mock handshake)", async () => {
    const r = await validateMcpServer("https://mcp.example.com");
    expect(r.valid).toBe(true);
    expect(r.reachable).toBe(true);
    expect(r.tools).toBe(3);
    expect(r.protocolVersion).toBe("2024-11-05");
  });

  it("rejects an unsupported protocol", async () => {
    const r = await validateMcpServer("ftp://mcp.example.com");
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/unsupported/i);
  });
});

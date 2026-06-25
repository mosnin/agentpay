// ---------------------------------------------------------------------------
// MCP (Model Context Protocol) interop adapter (MOCK / local data).
//
// Exposes:
//   - listToolsForAgent: synthesize the MCP tool list an agent would expose,
//     derived from its capabilities.
//   - validateMcpServer: a mock reachability/handshake check for an MCP URL.
//
// To go live: set MCP_GATEWAY_URL and replace the bodies with a real MCP
// client handshake (tools/list) against agent.mcpServerUrl.
// ---------------------------------------------------------------------------

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  };
}

type ToolSource = {
  name: string;
  capabilities: { capability: { name: string; slug: string } }[];
};

export function listToolsForAgent(agent: ToolSource): McpTool[] {
  return agent.capabilities.map(({ capability }) => ({
    name: capability.slug.replace(/-/g, "_"),
    description: `${capability.name} — exposed by ${agent.name} over MCP.`,
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Task input payload or reference." },
        context: { type: "object", description: "Optional execution context." },
      },
      required: ["input"],
    },
  }));
}

export interface McpValidation {
  valid: boolean;
  reachable: boolean;
  tools: number;
  protocolVersion: string;
  message: string;
}

export async function validateMcpServer(
  url: string | null | undefined,
): Promise<McpValidation> {
  if (!url) {
    return {
      valid: false,
      reachable: false,
      tools: 0,
      protocolVersion: "—",
      message: "No MCP server URL configured.",
    };
  }
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    return {
      valid: false,
      reachable: false,
      tools: 0,
      protocolVersion: "—",
      message: "Invalid MCP server URL.",
    };
  }
  // Mock a successful handshake for well-formed https URLs.
  const reachable = parsed.protocol === "https:" || parsed.protocol === "http:";
  return {
    valid: reachable,
    reachable,
    tools: reachable ? 3 : 0,
    protocolVersion: "2024-11-05",
    message: reachable
      ? "Handshake OK (mock). Server advertises tools/list."
      : "Unsupported protocol.",
  };
}

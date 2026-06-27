import type { AgentCardJson } from "@/lib/types";

// ---------------------------------------------------------------------------
// A2A (Agent-to-Agent) interop adapter (MOCK / local data).
//
// Exposes the three primitives a remote agent needs to interact with a listing:
//   - getAgentCard:        machine-readable capability + trust descriptor
//   - createTaskMessage:   wrap a task as an A2A message envelope
//   - parseArtifactMessage: read an incoming artifact submission
//
// Today these operate purely on local data. To federate with a real A2A
// registry, set A2A_REGISTRY_URL and replace the bodies — the envelope shapes
// already follow the A2A message convention.
// ---------------------------------------------------------------------------

type AgentCardSource = {
  id: string;
  name: string;
  category: string;
  verified: boolean;
  reputationScore: number;
  completionRate: number;
  disputeRate: number;
  schemaComplianceScore: number;
  pricingModel: string;
  startingPrice: number;
  currency: string;
  endpointUrl: string | null;
  mcpServerUrl: string | null;
  inputSchema?: unknown;
  outputSchema?: unknown;
  capabilities: { capability: { name: string; slug: string } }[];
};

export function getAgentCard(agent: AgentCardSource): AgentCardJson {
  return {
    agent_id: agent.id,
    name: agent.name,
    category: agent.category,
    capabilities: agent.capabilities.map((c) => c.capability.slug),
    pricing: {
      model: agent.pricingModel,
      starting_price: agent.startingPrice,
      currency: agent.currency,
    },
    input_schema: (agent.inputSchema as Record<string, unknown>) ?? {},
    output_schema: (agent.outputSchema as Record<string, unknown>) ?? {},
    endpoint: {
      url: agent.endpointUrl,
      mcp_server: agent.mcpServerUrl,
    },
    trust: {
      verified: agent.verified,
      reputation_score: agent.reputationScore,
      completion_rate: agent.completionRate,
      dispute_rate: agent.disputeRate,
      schema_compliance: agent.schemaComplianceScore,
    },
  };
}

export interface A2ATaskMessage {
  protocol: "a2a/0.1";
  type: "task.request";
  task_id: string;
  to_agent: string | null;
  from: string;
  objective: string;
  input: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  budget: { amount: number; currency: string };
  created_at: string;
}

export function createTaskMessage(task: {
  id: string;
  objective: string;
  sellerAgentId: string | null;
  buyerEmail: string;
  budget: number;
  currency: string;
  inputPayload?: unknown;
  outputSchema?: unknown;
}): A2ATaskMessage {
  return {
    protocol: "a2a/0.1",
    type: "task.request",
    task_id: task.id,
    to_agent: task.sellerAgentId,
    from: task.buyerEmail,
    objective: task.objective,
    input: (task.inputPayload as Record<string, unknown>) ?? {},
    output_schema: (task.outputSchema as Record<string, unknown>) ?? {},
    budget: { amount: task.budget, currency: task.currency },
    created_at: new Date().toISOString(),
  };
}

export interface ParsedArtifact {
  title: string;
  type: string;
  content: string | null;
  url: string | null;
}

export function parseArtifactMessage(message: unknown): ParsedArtifact {
  const msg = (message ?? {}) as Record<string, unknown>;
  return {
    title: typeof msg.title === "string" ? msg.title : "Artifact",
    type: typeof msg.type === "string" ? msg.type : "json",
    content:
      typeof msg.content === "string"
        ? msg.content
        : msg.content
          ? JSON.stringify(msg.content, null, 2)
          : null,
    url: typeof msg.url === "string" ? msg.url : null,
  };
}

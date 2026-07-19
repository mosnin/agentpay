import { Prisma } from "@prisma/client";

/** Discriminated result returned by every server action. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Agent payloads
// ---------------------------------------------------------------------------

export const agentCardInclude = {
  capabilities: { include: { capability: true } },
  organization: true,
  owner: true,
  _count: { select: { reviews: true } },
} satisfies Prisma.AgentInclude;

export type AgentCard = Prisma.AgentGetPayload<{ include: typeof agentCardInclude }>;

export const agentDetailInclude = {
  capabilities: { include: { capability: true } },
  organization: true,
  owner: true,
  reviews: {
    include: { user: true, task: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  },
  tasks: {
    include: { buyer: true, artifacts: true, payment: true, contract: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  },
  reputationEvents: { orderBy: { createdAt: "desc" }, take: 25 },
  // Latest verification checks per kind feed the profile's trust panel
  // (health / schema / identity) — see components/agents/verification-detail.
  verificationChecks: { orderBy: { createdAt: "desc" }, take: 12 },
  _count: { select: { reviews: true, tasks: true, reputationEvents: true } },
} satisfies Prisma.AgentInclude;

export type AgentDetail = Prisma.AgentGetPayload<{ include: typeof agentDetailInclude }>;

export type AgentCapabilityWithCapability = Prisma.AgentCapabilityGetPayload<{
  include: { capability: true };
}>;

// ---------------------------------------------------------------------------
// Task payloads
// ---------------------------------------------------------------------------

export const taskListInclude = {
  buyer: true,
  sellerAgent: { include: { organization: true } },
  payment: true,
  contract: true,
  _count: { select: { artifacts: true } },
} satisfies Prisma.TaskInclude;

export type TaskListItem = Prisma.TaskGetPayload<{ include: typeof taskListInclude }>;

export const taskDetailInclude = {
  buyer: true,
  sellerAgent: {
    include: {
      capabilities: { include: { capability: true } },
      owner: true,
      organization: true,
    },
  },
  contract: true,
  artifacts: { orderBy: { createdAt: "desc" } },
  payment: true,
  reviews: { include: { user: true }, orderBy: { createdAt: "desc" } },
  reputationEvents: { orderBy: { createdAt: "desc" } },
  disputes: { include: { openedBy: true }, orderBy: { createdAt: "desc" } },
} satisfies Prisma.TaskInclude;

export type TaskDetail = Prisma.TaskGetPayload<{ include: typeof taskDetailInclude }>;

// ---------------------------------------------------------------------------
// Machine-readable Agent Card (A2A-style) returned by the API + profile tab
// ---------------------------------------------------------------------------

export interface AgentCardJson {
  agent_id: string;
  name: string;
  category: string;
  capabilities: string[];
  pricing: {
    model: string;
    starting_price: number;
    currency: string;
  };
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  endpoint: {
    url: string | null;
    mcp_server: string | null;
  };
  trust: {
    verified: boolean;
    reputation_score: number;
    completion_rate: number;
    dispute_rate: number;
    schema_compliance: number;
  };
}

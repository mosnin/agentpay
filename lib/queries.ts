import { pageNumber, pageSize } from "./pagination";
import { paymentMode } from "./payment-mode";
import "server-only";
import { Prisma, type TaskStatus } from "@prisma/client";
import { prisma } from "./prisma";
import {
  agentCardInclude,
  agentDetailInclude,
  taskListInclude,
  taskDetailInclude,
  type AgentCard,
} from "./types";
import type { MarketplaceSort } from "./constants";

// ===========================================================================
// AGENTS
// ===========================================================================

export interface AgentFilter {
  q?: string;
  category?: string;
  pricingModel?: string;
  minRating?: number;
  verified?: boolean;
  sort?: MarketplaceSort;
}

function sortToOrderBy(sort: MarketplaceSort | undefined) {
  switch (sort) {
    case "rating":
      return { averageRating: "desc" as const };
    case "completion":
      return { completionRate: "desc" as const };
    case "price_asc":
      return { startingPrice: "asc" as const };
    case "price_desc":
      return { startingPrice: "desc" as const };
    case "newest":
      return { createdAt: "desc" as const };
    case "reputation":
    default:
      return { reputationScore: "desc" as const };
  }
}

// --- Free-text agent search -------------------------------------------------
// Shared by every agent search entry point (marketplace URL search, the A2A
// JSON listing API, and the ⌘K palette's quick search) so a multi-word query
// can surface an agent whose name alone wouldn't match — e.g. "csv cleanup"
// finding the Data Cleaning Agent via its capability list — as long as each
// word appears somewhere relevant: description, category, or a capability.
// Matching is plain case-insensitive substring (no stemming/fuzzy matching —
// see the ownership notes on trigram/tsvector), so near-miss spellings that
// aren't literal substrings of the stored text (e.g. "dedupe" vs. a stored
// "deduplication") won't match; that's an accepted limit of `contains`.

const MAX_SEARCH_TOKENS = 6;
const MIN_SEARCH_TOKEN_LENGTH = 2;

/**
 * Split a free-text query into whitespace-delimited tokens. Empty and
 * single-character tokens are dropped as noise — too short to be a useful
 * signal, and cheap to abuse into a slow query — and the token list is
 * capped so a pathological query can't blow up the generated AND-of-ORs.
 */
function tokenizeSearchQuery(query: string): string[] {
  return query
    .slice(0, 200)
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= MIN_SEARCH_TOKEN_LENGTH)
    .slice(0, MAX_SEARCH_TOKENS);
}

/** A single token must match at least one of these fields (case-insensitive substring). */
function agentTokenMatch(token: string): Prisma.AgentWhereInput {
  return {
    OR: [
      { name: { contains: token, mode: "insensitive" } },
      { shortDescription: { contains: token, mode: "insensitive" } },
      { longDescription: { contains: token, mode: "insensitive" } },
      { category: { contains: token, mode: "insensitive" } },
      {
        capabilities: {
          some: {
            capability: { name: { contains: token, mode: "insensitive" } },
          },
        },
      },
    ],
  };
}

function buildAgentWhere(filter: AgentFilter): Prisma.AgentWhereInput {
  const where: Prisma.AgentWhereInput = {
    status: "active",
  };
  // Every token must match somewhere (AND across tokens); a given token can
  // match any of the fields above (OR within a token). A query with no
  // tokens left after filtering (empty, or too short) applies no search
  // constraint at all, same as omitting `q`.
  const tokens = filter.q ? tokenizeSearchQuery(filter.q) : [];
  if (tokens.length > 0) {
    where.AND = tokens.map(agentTokenMatch);
  }
  if (filter.category) where.category = filter.category;
  if (filter.pricingModel) where.pricingModel = filter.pricingModel as never;
  if (filter.minRating) where.averageRating = { gte: filter.minRating };
  if (filter.verified) where.verified = true;
  return where;
}

/** Small curated lists only. Full discovery uses getAgentsPaginated. */
export async function getAgents(
  filter: AgentFilter = {},
): Promise<AgentCard[]> {
  return prisma.agent.findMany({
    where: buildAgentWhere(filter),
    include: agentCardInclude,
    take: 100,
    orderBy: [sortToOrderBy(filter.sort), { id: "asc" }],
  });
}

export const AGENTS_PAGE_SIZE = 24;

export async function getAgentsPaginated(
  filter: AgentFilter = {},
  page = 1,
  limit = AGENTS_PAGE_SIZE,
): Promise<{ agents: AgentCard[]; total: number }> {
  const where = buildAgentWhere(filter);
  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      include: agentCardInclude,
      orderBy: [sortToOrderBy(filter.sort), { id: "asc" }],
      skip: (pageNumber(page) - 1) * pageSize(limit),
      take: pageSize(limit),
    }),
    prisma.agent.count({ where }),
  ]);
  return { agents, total };
}

export interface AgentQuickResult {
  id: string;
  name: string;
  slug: string;
  category: string;
  verified: boolean;
  reputationScore: number;
}

/**
 * Minimal-field agent search for the ⌘K command palette: the same tokenized
 * AND-of-ORs matching as the marketplace search (see `buildAgentWhere`), but
 * trimmed to a lean projection and a small result cap so it stays cheap
 * enough to call on every debounced keystroke.
 */
export async function searchAgentsQuick(
  query: string,
  limit = 6,
): Promise<AgentQuickResult[]> {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return [];

  return prisma.agent.findMany({
    where: {
      status: "active",
      AND: tokens.map(agentTokenMatch),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      verified: true,
      reputationScore: true,
    },
    orderBy: [{ verified: "desc" }, { reputationScore: "desc" }],
    take: limit,
  });
}

export async function getFeaturedAgents(limit = 6): Promise<AgentCard[]> {
  return prisma.agent.findMany({
    where: { status: "active" },
    include: agentCardInclude,
    orderBy: { reputationScore: "desc" },
    take: limit,
  });
}

export async function getAgentByIdOrSlug(idOrSlug: string) {
  return prisma.agent.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: agentDetailInclude,
  });
}

// Same-category peers (highest reputation first) to keep discovery flowing
// after a profile view — the marketplace equivalent of "you might also like".
export async function getSimilarAgents(
  category: string,
  excludeId: string,
  limit = 3,
): Promise<AgentCard[]> {
  return prisma.agent.findMany({
    where: {
      category,
      id: { not: excludeId },
      status: "active",
    },
    include: agentCardInclude,
    orderBy: { reputationScore: "desc" },
    take: limit,
  });
}

export async function getAgentSelectOptions(q = "", selectedId?: string) {
  const agents = await prisma.agent.findMany({
    where: selectedId
      ? { status: "active", id: selectedId }
      : buildAgentWhere({ q }),
    take: 20,
    select: {
      id: true,
      name: true,
      category: true,
      startingPrice: true,
      currency: true,
      verified: true,
      pricingModel: true,
      capabilities: {
        select: { capability: { select: { name: true } } },
        take: 1,
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  // Flatten the primary capability so the task form can scaffold a brief.
  return agents.map(({ capabilities, ...a }) => ({
    ...a,
    primaryCapability: capabilities[0]?.capability.name ?? null,
  }));
}

export async function getCapabilities() {
  return prisma.capability.findMany({ orderBy: { name: "asc" } });
}

export async function getOrganizations(organizationId?: string | null) {
  if (!organizationId) return [];
  return prisma.organization.findMany({
    where: { id: organizationId },
    take: 1,
  });
}

export async function getCategorySummary(category: string) {
  const [verifiedCount, top] = await Promise.all([
    prisma.agent.count({
      where: { status: "active", category, verified: true },
    }),
    prisma.agent.aggregate({
      where: { status: "active", category },
      _max: { reputationScore: true },
    }),
  ]);
  return { verifiedCount, topReputationScore: top._max.reputationScore };
}

export async function getCategoryCounts() {
  const grouped = await prisma.agent.groupBy({
    by: ["category"],
    where: { status: "active" },
    _count: { _all: true },
  });
  return grouped.reduce<Record<string, number>>((acc, g) => {
    acc[g.category] = g._count._all;
    return acc;
  }, {});
}

// ===========================================================================
// TASKS
// ===========================================================================

export async function getTasks(
  where: import("@prisma/client").Prisma.TaskWhereInput = {},
) {
  return prisma.task.findMany({
    where,
    include: taskListInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTaskById(id: string) {
  return prisma.task.findUnique({ where: { id }, include: taskDetailInclude });
}

export async function getTasksForBuyer(buyerId: string) {
  return getTasks({ buyerId });
}

export async function getInboundTasksForOwner(ownerId: string) {
  return getTasks({ sellerAgent: { ownerId } });
}

// ===========================================================================
// MARKETPLACE STATS (landing)
// ===========================================================================

export async function getMarketplaceStats() {
  const [agentCount, verifiedCount, completedCount, reviewAgg, categoryCounts] =
    await Promise.all([
      prisma.agent.count({ where: { status: "active" } }),
      prisma.agent.count({ where: { verified: true } }),
      prisma.task.count({ where: { status: "completed" } }),
      prisma.review.aggregate({
        _avg: { rating: true },
        _count: { _all: true },
      }),
      getCategoryCounts(),
    ]);
  return {
    agentCount,
    verifiedCount,
    completedCount,
    avgRating: reviewAgg._avg.rating ?? 0,
    reviewCount: reviewAgg._count._all,
    categoryCount: Object.keys(categoryCounts).length,
  };
}

// ===========================================================================
// DASHBOARD
// ===========================================================================

function lastNDays(n: number): { date: string; key: string }[] {
  const days: { date: string; key: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    days.push({
      date: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      key: d.toISOString().slice(0, 10),
    });
  }
  return days;
}

/** Every task the user is involved in (as buyer, or owner of the selling agent), newest activity first. */
export async function getUserTasks(userId: string, statuses?: string[]) {
  return prisma.task.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerAgent: { ownerId: userId } }],
      ...(statuses && statuses.length > 0
        ? { status: { in: statuses as TaskStatus[] } }
        : {}),
    },
    include: taskListInclude,
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export const TASKS_PAGE_SIZE = 25;

export async function getUserTasksPaginated(
  userId: string,
  statuses: string[] | undefined,
  page = 1,
  limit = TASKS_PAGE_SIZE,
  role?: "buyer" | "seller",
): Promise<{ tasks: Awaited<ReturnType<typeof getUserTasks>>; total: number }> {
  const where: import("@prisma/client").Prisma.TaskWhereInput = {
    ...(role === "buyer"
      ? { buyerId: userId }
      : role === "seller"
        ? { sellerAgent: { ownerId: userId } }
        : { OR: [{ buyerId: userId }, { sellerAgent: { ownerId: userId } }] }),
    ...(statuses && statuses.length > 0
      ? { status: { in: statuses as TaskStatus[] } }
      : {}),
  };
  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskListInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (pageNumber(page) - 1) * pageSize(limit),
      take: pageSize(limit),
    }),
    prisma.task.count({ where }),
  ]);
  return { tasks, total };
}

/** Triage sort key: earliest deadline first, undated next, completed (no time pressure) last. */
function urgencyRank(item: {
  status: string;
  deadline: Date | string | null;
}): number {
  if (item.status === "completed") return Number.POSITIVE_INFINITY;
  return item.deadline
    ? new Date(item.deadline).getTime()
    : Number.MAX_SAFE_INTEGER;
}

export async function getDashboardData(userId: string) {
  const [
    ownedAgents,
    buyerTasks,
    releasedAsBuyer,
    releasedAsSeller,
    recentTasks,
    recentPayments,
    reputationChanges,
    recentTaskDates,
    attentionRaw,
    sellerInboundRaw,
    ownedStats,
  ] = await Promise.all([
    prisma.agent.findMany({
      where: { ownerId: userId },
      include: agentCardInclude,
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { buyerId: userId },
      _count: { _all: true },
    }),
    prisma.payment.aggregate({
      where: {
        status: "released",
        ...(paymentMode() !== "demo"
          ? { provider: "stripe", livemode: true }
          : {}),
        task: { buyerId: userId },
      },
      _sum: { amount: true },
    }),
    prisma.$queryRaw<Array<{ category: string; amount: number }>>(Prisma.sql`
      SELECT t.category, COALESCE(SUM(p.amount), 0)::float8 AS amount
      FROM "Payment" p JOIN "Task" t ON t.id = p."taskId"
      JOIN "Agent" a ON a.id = t."sellerAgentId"
      WHERE a."ownerId" = ${userId} AND p.status = 'released'
      ${paymentMode() !== "demo" ? Prisma.sql`AND p.provider = 'stripe' AND p.livemode = true` : Prisma.empty}
      GROUP BY t.category ORDER BY amount DESC
    `),
    prisma.task.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerAgent: { ownerId: userId } }],
      },
      include: taskListInclude,
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { task: { buyerId: userId } },
          { task: { sellerAgent: { ownerId: userId } } },
        ],
      },
      include: {
        task: { include: { sellerAgent: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.reputationEvent.findMany({
      where: { agent: { ownerId: userId } },
      include: { agent: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.$queryRaw<Array<{ key: string; tasks: number }>>(Prisma.sql`
      SELECT to_char(t."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS key, COUNT(*)::int AS tasks
      FROM "Task" t LEFT JOIN "Agent" a ON a.id = t."sellerAgentId"
      WHERE (t."buyerId" = ${userId} OR a."ownerId" = ${userId})
      AND t."createdAt" >= ${new Date(new Date().setUTCHours(0, 0, 0, 0) - 13 * 86400000)}
      GROUP BY 1 ORDER BY 1
    `),
    // Buyer-side: "validating" means an artifact passed and awaits this
    // buyer's approval; "completed" may still need a review.
    prisma.task.findMany({
      where: {
        buyerId: userId,
        OR: [
          { status: "validating" },
          { status: "completed", reviews: { none: { userId } } },
        ],
      },
      include: {
        sellerAgent: { select: { name: true } },
        reviews: { where: { userId }, select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    // Seller-side: inbound work on the operator's own agents awaiting their
    // move — "submitted" means the last artifact failed validation and needs
    // a corrected resubmission.
    prisma.task.findMany({
      where: {
        sellerAgent: { ownerId: userId },
        status: { in: ["pending", "accepted", "running", "submitted"] },
      },
      include: { sellerAgent: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.agent.aggregate({
      where: { ownerId: userId },
      _count: { _all: true },
      _avg: { reputationScore: true },
    }),
  ]);

  const totalSpend = releasedAsBuyer._sum.amount ?? 0;
  const totalEarnings = releasedAsSeller.reduce((s, p) => s + p.amount, 0);
  const activeStatuses = [
    "pending",
    "accepted",
    "running",
    "submitted",
    "validating",
  ];
  const activeTasks = buyerTasks
    .filter((t) => activeStatuses.includes(t.status))
    .reduce((sum, t) => sum + t._count._all, 0);
  const tasksCompleted =
    buyerTasks.find((t) => t.status === "completed")?._count._all ?? 0;
  const averageReputation = Math.round(ownedStats._avg.reputationScore ?? 0);

  // Chart: task volume by day (global marketplace activity)
  const days = lastNDays(14);
  const volumeMap = new Map(days.map((d) => [d.key, 0]));
  for (const t of recentTaskDates) {
    if (volumeMap.has(t.key)) volumeMap.set(t.key, t.tasks);
  }
  const taskVolume = days.map((d) => ({
    date: d.date,
    tasks: volumeMap.get(d.key) ?? 0,
  }));

  // Chart: revenue by category (this user's earnings)
  const revenueByCategory = releasedAsSeller;

  // Chart: reputation trend (cumulative deltas for owned agents)
  const repEvents = await prisma.$queryRaw<
    Array<{ key: string; delta: number }>
  >(Prisma.sql`
    SELECT to_char(e."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS key, SUM(e."scoreDelta")::int AS delta
    FROM "ReputationEvent" e JOIN "Agent" a ON a.id = e."agentId"
    WHERE a."ownerId" = ${userId} AND e."createdAt" >= ${new Date(new Date().setUTCHours(0, 0, 0, 0) - 13 * 86400000)}
    GROUP BY 1 ORDER BY 1
  `);
  const trendMap = new Map(days.map((d) => [d.key, 0]));
  for (const e of repEvents) {
    if (trendMap.has(e.key)) trendMap.set(e.key, e.delta);
  }
  let running = ownedStats._count._all
    ? averageReputation -
      repEvents.reduce((sum, e) => sum + e.delta, 0) / ownedStats._count._all
    : 0;
  const reputationTrend = repEvents.length
    ? days.map((d) => {
        running += (trendMap.get(d.key) ?? 0) / (ownedStats._count._all || 1);
        return { date: d.date, score: Math.max(0, Math.min(100, running)) };
      })
    : [];

  // Tasks awaiting the operator's own next move. Buyer-side (approve, review)
  // and seller-side (accept, start, submit, fix) statuses are disjoint, so the
  // two sets merge cleanly into a single triage list.
  const buyerAttention = attentionRaw
    .filter((t) => t.status !== "completed" || t.reviews.length === 0)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status as string,
      agentName: t.sellerAgent?.name ?? null,
      budget: t.budget,
      currency: t.currency,
      deadline: t.deadline,
    }));
  const sellerAttention = sellerInboundRaw.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status as string,
    agentName: t.sellerAgent?.name ?? null,
    budget: t.budget,
    currency: t.currency,
    deadline: t.deadline,
  }));
  const needsAttention = [...buyerAttention, ...sellerAttention]
    // Most time-critical first: earliest deadline → no-deadline → completed
    // (no time pressure). Stable, so the updatedAt order holds within a tier.
    .sort((a, b) => urgencyRank(a) - urgencyRank(b));

  return {
    stats: {
      totalSpend,
      totalEarnings,
      activeTasks,
      agentsOwned: ownedStats._count._all,
      averageReputation,
      tasksCompleted,
    },
    ownedAgents,
    needsAttention,
    recentTasks,
    recentPayments,
    reputationChanges,
    charts: { taskVolume, revenueByCategory, reputationTrend },
  };
}

// ===========================================================================
// SELLER
// ===========================================================================

export async function getSellerData(
  userId: string,
  page = 1,
  agentPage = 1,
  agentQuery = "",
) {
  const [
    ownedAgents,
    inboundTasks,
    releasedAsSeller,
    reviews,
    agentCount,
    taskGroups,
    reviewStats,
    taskCount,
    matchingAgents,
  ] = await Promise.all([
    prisma.agent.findMany({
      where: {
        ownerId: userId,
        name: { contains: agentQuery.slice(0, 120), mode: "insensitive" },
      },
      include: agentCardInclude,
      take: 25,
      skip: (pageNumber(agentPage) - 1) * 25,
      orderBy: [{ reputationScore: "desc" }, { id: "asc" }],
    }),
    prisma.task.findMany({
      where: { sellerAgent: { ownerId: userId } },
      include: taskListInclude,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: TASKS_PAGE_SIZE,
      skip: (pageNumber(page) - 1) * TASKS_PAGE_SIZE,
    }),
    prisma.payment.aggregate({
      where: {
        status: "released",
        ...(paymentMode() !== "demo"
          ? { provider: "stripe", livemode: true }
          : {}),
        task: { sellerAgent: { ownerId: userId } },
      },
      _sum: { amount: true },
    }),
    prisma.review.findMany({
      where: { agent: { ownerId: userId } },
      include: { user: true, agent: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.agent.count({ where: { ownerId: userId } }),
    prisma.task.groupBy({
      by: ["status"],
      where: { sellerAgent: { ownerId: userId } },
      _count: { _all: true },
      _sum: { budget: true },
    }),
    prisma.review.aggregate({
      where: { agent: { ownerId: userId } },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    prisma.task.count({ where: { sellerAgent: { ownerId: userId } } }),
    prisma.agent.count({
      where: {
        ownerId: userId,
        name: { contains: agentQuery.slice(0, 120), mode: "insensitive" },
      },
    }),
  ]);

  const totalEarnings = releasedAsSeller._sum.amount ?? 0;
  const openInbound = taskGroups
    .filter((t) =>
      ["pending", "accepted", "running", "submitted", "validating"].includes(
        t.status,
      ),
    )
    .reduce((sum, t) => sum + t._count._all, 0);
  const avgRating = reviewStats._avg.rating ?? 0;
  return {
    matchingAgents,
    taskCount,
    taskGroups,
    ownedAgents,
    inboundTasks,
    reviews,
    stats: {
      totalEarnings,
      agentCount,
      openInbound,
      avgRating,
      reviewCount: reviewStats._count._all,
    },
  };
}

// ===========================================================================
// ADMIN
// ===========================================================================

export async function getAdminData(page = 1, query = "") {
  const q = query.trim().slice(0, 120);
  const agentWhere: Prisma.AgentWhereInput = q
    ? { name: { contains: q, mode: "insensitive" } }
    : {};
  const disputeWhere: Prisma.DisputeWhereInput = q
    ? { task: { title: { contains: q, mode: "insensitive" } } }
    : {};
  const [
    agents,
    disputes,
    payments,
    reputationEvents,
    suspiciousTasks,
    counts,
  ] = await Promise.all([
    prisma.agent.findMany({
      where: agentWhere,
      take: 25,
      skip: (pageNumber(page) - 1) * 25,
      include: {
        owner: true,
        organization: true,
        _count: { select: { capabilities: true, tasks: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    prisma.dispute.findMany({
      where: disputeWhere,
      take: 25,
      skip: (pageNumber(page) - 1) * 25,
      include: {
        task: { include: { sellerAgent: { select: { name: true } } } },
        openedBy: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    prisma.payment.findMany({
      include: { task: { select: { id: true, title: true, category: true } } },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
    prisma.reputationEvent.findMany({
      include: { agent: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.task.findMany({
      where: {
        OR: [
          { status: "disputed" },
          { artifacts: { some: { validationStatus: "failed" } } },
          { budget: { gte: 100 } },
        ],
      },
      include: taskListInclude,
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    Promise.all([
      prisma.agent.count(),
      prisma.agent.count({ where: agentWhere }),
      prisma.dispute.count({ where: disputeWhere }),
      prisma.agent.count({ where: { verified: false } }),
      prisma.dispute.count({ where: { status: "open" } }),
      prisma.payment.aggregate({
        where: { status: "released" },
        _sum: { amount: true },
      }),
    ]),
  ]);

  const [
    agentCount,
    matchingAgentCount,
    disputeCount,
    unverifiedCount,
    openDisputes,
    releasedSum,
  ] = counts;

  return {
    agents,
    disputes,
    payments,
    reputationEvents,
    suspiciousTasks,
    paginationTotal: Math.max(matchingAgentCount, disputeCount),
    stats: {
      agentCount,
      unverifiedCount,
      openDisputes,
      totalReleased: releasedSum._sum.amount ?? 0,
    },
  };
}

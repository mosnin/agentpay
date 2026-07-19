import { describe, it, expect, vi, beforeEach } from "vitest";

// lib/reputation.ts and lib/actions/reviews.ts both reach the real Prisma
// client transitively (lib/prisma.ts), which requires a live datasource —
// stub it so every test below drives controlled, in-memory data instead.
// Mirrors the pattern in lib/__tests__/webhooks.test.ts. `vi.mock` factories
// are hoisted above imports, and referencing an out-of-scope object from one
// requires `vi.hoisted` — hence building `prismaMock` that way.
vi.mock("server-only", () => ({}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    review: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    task: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    reputationEvent: { findMany: vi.fn(), create: vi.fn() },
    agent: { update: vi.fn(), findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// createReview (lib/actions/reviews.ts) also pulls in requireUser() — which
// for real would reach next/headers + Clerk, neither available under plain
// Node/vitest — and next/cache's revalidatePath(), which throws outside a
// real Next.js render. Both are stubbed. onReviewCreated is spied on (via
// importOriginal, which keeps every OTHER lib/reputation.ts export real) so
// the "createReview routes through onReviewCreated" contract stays
// checkable without re-deriving reputation.ts's own internals a second time
// in this file's review-gating tests.
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/reputation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reputation")>();
  return { ...actual, onReviewCreated: vi.fn() };
});

import {
  decayWeight,
  computeDecayedReputationScore,
  recalcAgentDerivedStats,
  recordReputationEvent,
  onReviewCreated,
  REPUTATION_HALF_LIFE_DAYS,
  REPUTATION_BASE_SCORE,
} from "@/lib/reputation";
import { createReview } from "@/lib/actions/reviews";
import { requireUser } from "@/lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;
const HALF_LIFE_MS = REPUTATION_HALF_LIFE_DAYS * DAY_MS;

beforeEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// Decay math — pure functions, deterministic timestamps injected throughout.
// ===========================================================================

describe("decayWeight", () => {
  it("is 1 for a brand-new event (age 0)", () => {
    expect(decayWeight(0)).toBe(1);
  });

  it("is 1 (never boosted above full weight) for a future-timestamped event", () => {
    expect(decayWeight(-1000)).toBe(1);
  });

  it("is 0.5 at exactly one half-life", () => {
    expect(decayWeight(HALF_LIFE_MS)).toBeCloseTo(0.5, 10);
  });

  it("is 0.25 at exactly two half-lives", () => {
    expect(decayWeight(2 * HALF_LIFE_MS)).toBeCloseTo(0.25, 10);
  });

  it("is 0.125 at exactly three half-lives", () => {
    expect(decayWeight(3 * HALF_LIFE_MS)).toBeCloseTo(0.125, 10);
  });

  it("decreases monotonically as age increases", () => {
    const ages = [0, DAY_MS, 10 * DAY_MS, HALF_LIFE_MS, 365 * DAY_MS, 2000 * DAY_MS];
    const weights = ages.map((age) => decayWeight(age));
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeLessThan(weights[i - 1]);
    }
  });

  it("approaches but never reaches 0 for very old events", () => {
    const weight = decayWeight(20 * 365 * DAY_MS); // 20 years
    expect(weight).toBeGreaterThan(0);
    expect(weight).toBeLessThan(0.001);
  });

  it("respects a custom half-life override", () => {
    expect(decayWeight(30 * DAY_MS, 30)).toBeCloseTo(0.5, 10);
  });
});

describe("computeDecayedReputationScore", () => {
  const now = new Date("2026-07-19T00:00:00.000Z");

  it("returns the base score when there is no event history", () => {
    expect(computeDecayedReputationScore([], now)).toBe(REPUTATION_BASE_SCORE);
  });

  it("adds a brand-new event's delta at full weight", () => {
    const events = [{ scoreDelta: 10, createdAt: now }];
    expect(computeDecayedReputationScore(events, now)).toBe(REPUTATION_BASE_SCORE + 10);
  });

  it("halves a positive delta's contribution after exactly one half-life", () => {
    const events = [{ scoreDelta: 10, createdAt: new Date(now.getTime() - HALF_LIFE_MS) }];
    expect(computeDecayedReputationScore(events, now)).toBe(REPUTATION_BASE_SCORE + 5);
  });

  it("clamps to 100 even with an overwhelming amount of positive history", () => {
    const events = Array.from({ length: 50 }, () => ({ scoreDelta: 20, createdAt: now }));
    expect(computeDecayedReputationScore(events, now)).toBe(100);
  });

  it("clamps to 0 even with an overwhelming amount of negative history", () => {
    const events = Array.from({ length: 50 }, () => ({ scoreDelta: -20, createdAt: now }));
    expect(computeDecayedReputationScore(events, now)).toBe(0);
  });

  it("is deterministic: replaying the same history twice yields the same score", () => {
    const events = [
      { scoreDelta: 3, createdAt: new Date(now.getTime() - 5 * DAY_MS) },
      { scoreDelta: -6, createdAt: new Date(now.getTime() - 40 * DAY_MS) },
      { scoreDelta: 2, createdAt: new Date(now.getTime() - 200 * DAY_MS) },
    ];
    expect(computeDecayedReputationScore(events, now)).toBe(
      computeDecayedReputationScore(events, now),
    );
  });

  it("is independent of event order (a pure sum of independently-weighted terms)", () => {
    const events = [
      { scoreDelta: 3, createdAt: new Date(now.getTime() - 5 * DAY_MS) },
      { scoreDelta: -6, createdAt: new Date(now.getTime() - 40 * DAY_MS) },
      { scoreDelta: 2, createdAt: new Date(now.getTime() - 200 * DAY_MS) },
    ];
    const shuffled = [events[2], events[0], events[1]];
    expect(computeDecayedReputationScore(events, now)).toBe(
      computeDecayedReputationScore(shuffled, now),
    );
  });

  it("never lets a multi-year-old event outrank a recent one of the same magnitude", () => {
    // The mission-critical property: "a 2024 event must not outrank last
    // week's performance." Same-sized penalty, two very different ages —
    // the stale one must have decayed to near-nothing while the recent one
    // still bites.
    const twoYearsAgo = new Date(now.getTime() - 2 * 365 * DAY_MS);
    const lastWeek = new Date(now.getTime() - 7 * DAY_MS);

    const staleOnly = computeDecayedReputationScore([{ scoreDelta: -20, createdAt: twoYearsAgo }], now);
    const recentOnly = computeDecayedReputationScore([{ scoreDelta: -20, createdAt: lastWeek }], now);

    expect(staleOnly).toBeGreaterThan(recentOnly);
    // The two-year-old penalty should have faded to within a point of baseline.
    expect(staleOnly).toBeGreaterThanOrEqual(REPUTATION_BASE_SCORE - 1);
  });

  it("nets a dispute-then-dismissal pair back to exactly baseline once equally aged", () => {
    // onDisputeDismissed records a +6 event that reverses dispute_opened's
    // -6 (see SCORE_DELTAS.dispute_opened). Once both have aged identically,
    // their weighted contributions are exact opposites and must cancel —
    // vindication should leave no permanent mark, at any age.
    const pairedEvents = [
      { scoreDelta: -6, createdAt: new Date(now.getTime() - 100 * DAY_MS) },
      { scoreDelta: 6, createdAt: new Date(now.getTime() - 100 * DAY_MS) },
    ];
    expect(computeDecayedReputationScore(pairedEvents, now)).toBe(REPUTATION_BASE_SCORE);
  });

  it("supports a custom base score", () => {
    expect(computeDecayedReputationScore([], now, 70)).toBe(70);
  });
});

// ===========================================================================
// recordReputationEvent — verifies the wiring: write the event, then
// recompute reputationScore from the (mocked) full decayed history.
// ===========================================================================

describe("recordReputationEvent", () => {
  it("writes the event and recomputes reputationScore from decayed history", async () => {
    const fixedNow = new Date("2026-07-19T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
    try {
      prismaMock.reputationEvent.create.mockResolvedValue({});
      // Prior history the (mocked) re-fetch returns: one event exactly one
      // half-life old -> weight 0.5 -> base(50) + 10*0.5 = 55. This mock is
      // static (doesn't include the event .create() just wrote) — the point
      // of this test is verifying the create -> re-fetch -> decay -> write
      // wiring, not re-proving the decay math (covered above).
      prismaMock.reputationEvent.findMany.mockResolvedValue([
        { scoreDelta: 10, createdAt: new Date(fixedNow.getTime() - HALF_LIFE_MS) },
      ]);

      const delta = await recordReputationEvent({ agentId: "agent-1", type: "task_completed" });

      expect(delta).toBe(2); // SCORE_DELTAS.task_completed
      expect(prismaMock.reputationEvent.create).toHaveBeenCalledWith({
        data: {
          agentId: "agent-1",
          taskId: null,
          type: "task_completed",
          scoreDelta: 2,
          reason: null,
        },
      });
      expect(prismaMock.reputationEvent.findMany).toHaveBeenCalledWith({
        where: { agentId: "agent-1" },
        select: { scoreDelta: true, createdAt: true },
      });
      expect(prismaMock.agent.update).toHaveBeenCalledWith({
        where: { id: "agent-1" },
        data: { reputationScore: 55 },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("still recomputes (not a no-op) when the event's own delta is 0", async () => {
    // A delta-0 marker (e.g. "listed on marketplace") shouldn't skip the
    // recompute: time may have passed since the last one, shifting how much
    // PRIOR events now weigh.
    prismaMock.reputationEvent.create.mockResolvedValue({});
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);

    await recordReputationEvent({
      agentId: "agent-1",
      type: "schema_compliance",
      scoreDelta: 0,
      reason: "Agent listed on the marketplace",
    });

    expect(prismaMock.agent.update).toHaveBeenCalledWith({
      where: { id: "agent-1" },
      data: { reputationScore: REPUTATION_BASE_SCORE },
    });
  });
});

// ===========================================================================
// recalcAgentDerivedStats — rate/average computations against mocked rows.
// ===========================================================================

/** Discriminates prisma.task.count's three distinct call shapes by their
 * where-clause, so tests don't depend on the internal Promise.all ordering. */
function mockTaskCounts(counts: { total: number; completed: number; disputedEver: number }) {
  prismaMock.task.count.mockImplementation(async (args) => {
    const where = (args as { where?: Record<string, unknown> } | undefined)?.where ?? {};
    if (where.disputes) return counts.disputedEver;
    if (where.status === "completed") return counts.completed;
    return counts.total;
  });
}

describe("recalcAgentDerivedStats", () => {
  const agentId = "agent-1";

  it("computes completionRate and disputeRate as real fractions of total assigned tasks", async () => {
    mockTaskCounts({ total: 10, completed: 7, disputedEver: 2 });
    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);
    prismaMock.task.findMany.mockResolvedValue([]);

    await recalcAgentDerivedStats(agentId);

    expect(prismaMock.agent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: agentId },
        data: expect.objectContaining({
          completionRate: 0.7,
          disputeRate: 0.2,
          totalTasksCompleted: 7,
        }),
      }),
    );
  });

  it("avoids divide-by-zero: a brand-new agent with no assigned tasks gets 0 rates, not NaN", async () => {
    mockTaskCounts({ total: 0, completed: 0, disputedEver: 0 });
    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);
    prismaMock.task.findMany.mockResolvedValue([]);

    await recalcAgentDerivedStats(agentId);

    const data = prismaMock.agent.update.mock.calls[0][0].data;
    expect(data.completionRate).toBe(0);
    expect(data.disputeRate).toBe(0);
    expect(Number.isNaN(data.completionRate)).toBe(false);
    expect(Number.isNaN(data.disputeRate)).toBe(false);
  });

  it("counts a task toward the dispute rate for life, even after its dispute is resolved", async () => {
    mockTaskCounts({ total: 5, completed: 3, disputedEver: 1 });
    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);
    prismaMock.task.findMany.mockResolvedValue([]);

    await recalcAgentDerivedStats(agentId);

    // The query keys off "ever had a Dispute row", not the task's CURRENT
    // status — resolveDispute() moves status off "disputed", so a rate
    // based on current status alone would let a resolved dispute vanish.
    expect(prismaMock.task.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ disputes: { some: {} } }),
      }),
    );
    expect(prismaMock.agent.update.mock.calls[0][0].data.disputeRate).toBe(0.2);
  });

  it("averages real review ratings, and reports 0 (not NaN) with no reviews", async () => {
    mockTaskCounts({ total: 0, completed: 0, disputedEver: 0 });
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);
    prismaMock.task.findMany.mockResolvedValue([]);

    prismaMock.review.findMany.mockResolvedValue([{ rating: 5 }, { rating: 3 }, { rating: 4 }]);
    await recalcAgentDerivedStats(agentId);
    expect(prismaMock.agent.update.mock.calls[0][0].data.averageRating).toBe(4);

    prismaMock.review.findMany.mockResolvedValue([]);
    await recalcAgentDerivedStats(agentId);
    expect(prismaMock.agent.update.mock.calls[1][0].data.averageRating).toBe(0);
  });

  it("derives schemaComplianceScore as the real pass rate of schema_compliance events", async () => {
    mockTaskCounts({ total: 0, completed: 0, disputedEver: 0 });
    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.task.findMany.mockResolvedValue([]);
    prismaMock.reputationEvent.findMany.mockResolvedValue([
      { scoreDelta: 1 },
      { scoreDelta: 1 },
      { scoreDelta: -1 },
    ]);

    await recalcAgentDerivedStats(agentId);

    // Excludes the delta-0 "listed on marketplace" marker, which carries no
    // taskId — only real per-artifact validation events count.
    expect(prismaMock.reputationEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "schema_compliance", taskId: { not: null } }),
      }),
    );
    const data = prismaMock.agent.update.mock.calls[0][0].data;
    // Source rounds to 1 decimal place (toFixed(1)) before storing, so the
    // expected value is the rounded 66.7, not the raw repeating 66.66...
    expect(data.schemaComplianceScore).toBeCloseTo(66.7, 5);
  });

  it("reports schemaComplianceScore 0 (not NaN) with no validation events yet", async () => {
    mockTaskCounts({ total: 0, completed: 0, disputedEver: 0 });
    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.task.findMany.mockResolvedValue([]);
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);

    await recalcAgentDerivedStats(agentId);

    expect(prismaMock.agent.update.mock.calls[0][0].data.schemaComplianceScore).toBe(0);
  });

  it("computes averageLatencyMinutes as the mean time from task creation to first artifact", async () => {
    mockTaskCounts({ total: 2, completed: 2, disputedEver: 0 });
    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);

    const t0 = new Date("2026-07-01T00:00:00.000Z");
    prismaMock.task.findMany.mockResolvedValue([
      { createdAt: t0, artifacts: [{ createdAt: new Date(t0.getTime() + 15 * 60_000) }] },
      { createdAt: t0, artifacts: [{ createdAt: new Date(t0.getTime() + 45 * 60_000) }] },
    ]);

    await recalcAgentDerivedStats(agentId);

    expect(prismaMock.agent.update.mock.calls[0][0].data.averageLatencyMinutes).toBe(30);
  });

  it("reports 0 latency (not NaN) when no completed task has a delivered artifact yet", async () => {
    mockTaskCounts({ total: 1, completed: 0, disputedEver: 0 });
    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);
    prismaMock.task.findMany.mockResolvedValue([]);

    await recalcAgentDerivedStats(agentId);

    expect(prismaMock.agent.update.mock.calls[0][0].data.averageLatencyMinutes).toBe(0);
  });

  it("stamps reputationUpdatedAt with a fresh Date on every recompute", async () => {
    mockTaskCounts({ total: 0, completed: 0, disputedEver: 0 });
    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.reputationEvent.findMany.mockResolvedValue([]);
    prismaMock.task.findMany.mockResolvedValue([]);

    const before = Date.now();
    await recalcAgentDerivedStats(agentId);
    const after = Date.now();

    const stamped = prismaMock.agent.update.mock.calls[0][0].data.reputationUpdatedAt as Date;
    expect(stamped).toBeInstanceOf(Date);
    expect(stamped.getTime()).toBeGreaterThanOrEqual(before);
    expect(stamped.getTime()).toBeLessThanOrEqual(after);
  });
});

// ===========================================================================
// createReview — review-gating logic (lib/actions/reviews.ts).
// ===========================================================================

const BUYER_ID = "user-buyer";
const STRANGER_ID = "user-stranger";
const AGENT_ID = "agent-1";
const TASK_ID = "task-1";

function fakeUser(id: string): Awaited<ReturnType<typeof requireUser>> {
  return { id, role: "operator" } as unknown as Awaited<ReturnType<typeof requireUser>>;
}

/** A task shaped to pass every gate by default; each test overrides exactly
 * the field it means to violate. */
function baseTask(overrides: Record<string, unknown> = {}) {
  return {
    sellerAgentId: AGENT_ID,
    status: "completed",
    buyerId: BUYER_ID,
    payment: { status: "released" },
    ...overrides,
  };
}

describe("createReview (review-gating logic)", () => {
  it("rejects an out-of-range rating before touching the database", async () => {
    const result = await createReview(TASK_ID, { rating: 6 });

    expect(result.ok).toBe(false);
    expect(prismaMock.task.findUnique).not.toHaveBeenCalled();
  });

  it("fails when the task does not exist", async () => {
    vi.mocked(requireUser).mockResolvedValue(fakeUser(BUYER_ID));
    prismaMock.task.findUnique.mockResolvedValue(null);

    const result = await createReview(TASK_ID, { rating: 5 });

    expect(result).toEqual({ ok: false, error: "Task not found." });
    expect(prismaMock.review.create).not.toHaveBeenCalled();
  });

  it("rejects a reviewer who is not the task's buyer", async () => {
    vi.mocked(requireUser).mockResolvedValue(fakeUser(STRANGER_ID));
    prismaMock.task.findUnique.mockResolvedValue(baseTask());

    const result = await createReview(TASK_ID, { rating: 5 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/paid for/i);
    expect(prismaMock.review.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.review.create).not.toHaveBeenCalled();
  });

  it("rejects a review on a task that is not completed", async () => {
    vi.mocked(requireUser).mockResolvedValue(fakeUser(BUYER_ID));
    prismaMock.task.findUnique.mockResolvedValue(baseTask({ status: "validating" }));

    const result = await createReview(TASK_ID, { rating: 5 });

    expect(result).toEqual({ ok: false, error: "You can only review a completed task." });
    expect(prismaMock.review.create).not.toHaveBeenCalled();
  });

  it("rejects a review when payment has not actually been released", async () => {
    vi.mocked(requireUser).mockResolvedValue(fakeUser(BUYER_ID));
    prismaMock.task.findUnique.mockResolvedValue(baseTask({ payment: { status: "escrowed" } }));

    const result = await createReview(TASK_ID, { rating: 5 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/paid for/i);
    expect(prismaMock.review.create).not.toHaveBeenCalled();
  });

  it("fails closed when the task has no payment record at all", async () => {
    vi.mocked(requireUser).mockResolvedValue(fakeUser(BUYER_ID));
    prismaMock.task.findUnique.mockResolvedValue(baseTask({ payment: null }));

    const result = await createReview(TASK_ID, { rating: 5 });

    expect(result.ok).toBe(false);
    expect(prismaMock.review.create).not.toHaveBeenCalled();
  });

  it("rejects a second review from the same buyer on the same task", async () => {
    vi.mocked(requireUser).mockResolvedValue(fakeUser(BUYER_ID));
    prismaMock.task.findUnique.mockResolvedValue(baseTask());
    prismaMock.review.findFirst.mockResolvedValue({ id: "existing-review" });

    const result = await createReview(TASK_ID, { rating: 5 });

    expect(result).toEqual({ ok: false, error: "You already reviewed this task." });
    expect(prismaMock.review.create).not.toHaveBeenCalled();
  });

  it("succeeds for the buyer of a completed, paid task with no prior review, and routes through onReviewCreated", async () => {
    vi.mocked(requireUser).mockResolvedValue(fakeUser(BUYER_ID));
    prismaMock.task.findUnique.mockResolvedValue(baseTask());
    prismaMock.review.findFirst.mockResolvedValue(null);
    prismaMock.review.create.mockResolvedValue({ id: "new-review" });

    const result = await createReview(TASK_ID, { rating: 5, comment: "Great work" });

    expect(result).toEqual({ ok: true });
    expect(prismaMock.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskId: TASK_ID,
          agentId: AGENT_ID,
          userId: BUYER_ID,
          rating: 5,
          comment: "Great work",
        }),
      }),
    );
    expect(vi.mocked(onReviewCreated)).toHaveBeenCalledWith(AGENT_ID, TASK_ID, 5);
  });
});

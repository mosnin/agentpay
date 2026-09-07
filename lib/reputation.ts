import { prisma } from "./prisma";
import { clamp } from "./utils";
import type { ReputationEventType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Reputation engine.
//
// Every number this module writes to Agent must be derivable from real rows
// (Task, Review, Dispute, Artifact, ReputationEvent) — never a seeded
// constant, never a hand-nudged running total. Two halves:
//
//   1. reputationScore — a time-decayed replay of this agent's FULL
//      ReputationEvent history (see computeDecayedReputationScore below),
//      recomputed from scratch on every event. That makes it deterministic
//      and "replay-safe": the same event history always reproduces the same
//      score, and recent activity always outweighs old activity by
//      construction — a multi-year-old event can never outrank last week's.
//   2. Everything else (averageRating, completionRate, disputeRate,
//      averageLatencyMinutes, schemaComplianceScore, totalTasksCompleted) —
//      recomputed directly from Task/Review/Artifact rows in
//      recalcAgentDerivedStats, with no incremental bookkeeping to drift.
// ---------------------------------------------------------------------------

export const SCORE_DELTAS: Record<ReputationEventType, number> = {
  task_completed: 2,
  positive_review: 3,
  negative_review: -3,
  dispute_opened: -6,
  dispute_resolved: 2,
  verification: 4,
  schema_compliance: 1,
  sla_met: 1,
  sla_missed: -2,
};

// --- Time-decayed reputationScore -------------------------------------------

/**
 * Half-life, in days, for a ReputationEvent's influence on reputationScore:
 * its contribution to the score halves every N days. 90 days (one quarter)
 * is long enough that a single incident doesn't define an agent forever,
 * short enough that stale history can't outrank recent performance — a
 * dispute from a year ago has decayed to ~6% of its original weight by the
 * time a dispute from last week is still near full strength.
 */
export const REPUTATION_HALF_LIFE_DAYS = 90;

/**
 * Neutral anchor for the decayed score when there's no (or fully aged-out)
 * history — mirrors the Agent.reputationScore schema default, so an agent
 * with no real signal yet reads as neither trusted nor distrusted.
 */
export const REPUTATION_BASE_SCORE = 50;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Exponential decay weight for an event `ageMs` milliseconds old: 1 the
 * instant it's recorded, 0.5 at one half-life, 0.25 at two, asymptotically
 * approaching (never reaching) 0. `2 ** (-age / halfLife)` is the standard
 * half-life form of exponential decay. An event timestamped in the future
 * (clock skew) is treated as age 0 rather than boosted above full weight.
 */
export function decayWeight(
  ageMs: number,
  halfLifeDays: number = REPUTATION_HALF_LIFE_DAYS,
): number {
  if (ageMs <= 0) return 1;
  const ageDays = ageMs / MS_PER_DAY;
  return Math.pow(2, -ageDays / halfLifeDays);
}

/**
 * Recompute reputationScore as base + Σ(scoreDelta_i × decayWeight(age_i)),
 * clamped to [0,100]. Pure and deterministic — depends only on each event's
 * own delta and age, never on insertion order or a previously stored score —
 * so replaying the same history always reproduces the same number. `now` is
 * injectable so callers (and tests) can pin the reference instant.
 */
export function computeDecayedReputationScore(
  events: { scoreDelta: number; createdAt: Date }[],
  now: Date = new Date(),
  base: number = REPUTATION_BASE_SCORE,
): number {
  const weighted = events.reduce((sum, event) => {
    const ageMs = now.getTime() - event.createdAt.getTime();
    return sum + event.scoreDelta * decayWeight(ageMs);
  }, 0);
  return clamp(Math.round(base + weighted), 0, 100);
}

/**
 * Fetch an agent's full ReputationEvent history and persist the freshly
 * decayed reputationScore. Split out from recordReputationEvent so a future
 * caller (e.g. a scheduled re-decay job, so scores keep drifting downward
 * even between events) could reuse it; every call site today goes through
 * recordReputationEvent.
 */
async function recomputeReputationScore(agentId: string): Promise<number> {
  const events = await prisma.reputationEvent.findMany({
    where: { agentId },
    select: { scoreDelta: true, createdAt: true },
  });
  const score = computeDecayedReputationScore(events);
  await prisma.agent.update({ where: { id: agentId }, data: { reputationScore: score } });
  return score;
}

export async function recordReputationEvent(args: {
  agentId: string;
  taskId?: string | null;
  type: ReputationEventType;
  scoreDelta?: number;
  reason?: string;
}) {
  const delta = args.scoreDelta ?? SCORE_DELTAS[args.type] ?? 0;

  await prisma.reputationEvent.create({
    data: {
      agentId: args.agentId,
      taskId: args.taskId ?? null,
      type: args.type,
      scoreDelta: delta,
      reason: args.reason ?? null,
    },
  });

  // Full recompute rather than an incremental nudge: every event's weight is
  // a function of its own age, so only replaying the whole history keeps the
  // stored score honestly time-decayed — even a delta-0 marker event still
  // triggers a (cheap, idempotent) re-decay of everything recorded before it.
  await recomputeReputationScore(args.agentId);

  return delta;
}

/**
 * Recompute averageRating, completionRate, disputeRate, totalTasksCompleted,
 * averageLatencyMinutes, and schemaComplianceScore strictly from real rows —
 * no seeded numbers, no rolling/incremental approximations — and stamp
 * reputationUpdatedAt so the profile can show how fresh this snapshot is.
 */
export async function recalcAgentDerivedStats(agentId: string) {
  const [reviews, totalAssigned, completed, disputedEver, schemaEvents, completedWithArtifact] =
    await Promise.all([
      prisma.review.findMany({ where: { agentId }, select: { rating: true } }),
      prisma.task.count({ where: { sellerAgentId: agentId } }),
      prisma.task.count({ where: { sellerAgentId: agentId, status: "completed" } }),
      // Lifetime dispute rate: a task counts once it has EVER carried a
      // dispute, even after resolveDispute() moves its status off
      // "disputed" — keying off current status alone would let a resolved
      // dispute silently vanish from the rate.
      prisma.task.count({ where: { sellerAgentId: agentId, disputes: { some: {} } } }),
      // One "schema_compliance" ReputationEvent is written per real,
      // non-skipped artifact validation (see onValidationComplete below and
      // submitArtifact/runValidation in lib/actions/tasks.ts). Filtering to
      // events that carry a taskId excludes the delta-0 "listed on
      // marketplace" marker recorded at agent creation, which has none.
      prisma.reputationEvent.findMany({
        where: { agentId, type: "schema_compliance", taskId: { not: null } },
        select: { scoreDelta: true },
      }),
      // "Time to first artifact": task creation to the agent's earliest
      // delivered artifact, sampled over completed tasks only so latency and
      // totalTasksCompleted describe the same population.
      prisma.task.findMany({
        where: { sellerAgentId: agentId, status: "completed", artifacts: { some: {} } },
        select: {
          createdAt: true,
          artifacts: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
        },
      }),
    ]);

  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const completionRate = totalAssigned ? completed / totalAssigned : 0;
  const disputeRate = totalAssigned ? disputedEver / totalAssigned : 0;

  const schemaChecks = schemaEvents.length;
  const schemaPassed = schemaEvents.filter((e) => e.scoreDelta > 0).length;
  const schemaComplianceScore = schemaChecks
    ? Number(((schemaPassed / schemaChecks) * 100).toFixed(1))
    : 0;

  const latencySamples: number[] = [];
  for (const task of completedWithArtifact) {
    const firstArtifact = task.artifacts[0];
    if (!firstArtifact) continue;
    const minutes = (firstArtifact.createdAt.getTime() - task.createdAt.getTime()) / 60_000;
    // Guard against clock-skewed/backfilled rows producing a negative sample.
    if (minutes >= 0) latencySamples.push(minutes);
  }
  const averageLatencyMinutes = latencySamples.length
    ? Math.round(latencySamples.reduce((sum, m) => sum + m, 0) / latencySamples.length)
    : 0;

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      averageRating: Number(averageRating.toFixed(2)),
      completionRate: Number(completionRate.toFixed(3)),
      disputeRate: Number(disputeRate.toFixed(3)),
      totalTasksCompleted: completed,
      averageLatencyMinutes,
      schemaComplianceScore,
      reputationUpdatedAt: new Date(),
    },
  });
}

// --- High-level lifecycle hooks used by server actions ---------------------

export async function onTaskCompleted(agentId: string, taskId: string) {
  await recordReputationEvent({
    agentId,
    taskId,
    type: "task_completed",
    reason: "Task completed and payment released",
  });
  await recalcAgentDerivedStats(agentId);
}

export async function onReviewCreated(
  agentId: string,
  taskId: string,
  rating: number,
) {
  // 4–5★ positive, 3★ neutral (no score change), 1–2★ negative.
  const positive = rating >= 4;
  const neutral = rating === 3;
  await recordReputationEvent({
    agentId,
    taskId,
    type: positive || neutral ? "positive_review" : "negative_review",
    scoreDelta: neutral ? 0 : positive ? 3 : -3,
    reason: `Buyer left a ${rating}★ review`,
  });
  await recalcAgentDerivedStats(agentId);
}

export async function onDisputeOpened(agentId: string, taskId: string) {
  await recordReputationEvent({
    agentId,
    taskId,
    type: "dispute_opened",
    reason: "Dispute opened on task",
  });
  await recalcAgentDerivedStats(agentId);
}

/**
 * A dispute dismissed as baseless ("rejected") clears the agent: credit back the
 * open-dispute penalty so a vindicated agent's reputation fully recovers (net 0).
 */
export async function onDisputeDismissed(agentId: string, taskId: string) {
  await recordReputationEvent({
    agentId,
    taskId,
    type: "dispute_resolved",
    scoreDelta: -SCORE_DELTAS.dispute_opened, // reverse the -6 open penalty (+6)
    reason: "Dispute dismissed — reputation restored",
  });
  await recalcAgentDerivedStats(agentId);
}

export async function onAgentVerified(agentId: string) {
  await recordReputationEvent({
    agentId,
    type: "verification",
    reason: "Agent passed verification",
  });
}

/**
 * Records a real schema-compliance signal from artifact validation — fired
 * only for a genuine, non-skipped check (see submitArtifact/runValidation in
 * lib/actions/tasks.ts) — and routes through the same real recompute as
 * every other lifecycle hook: recalcAgentDerivedStats derives
 * schemaComplianceScore fresh from the full schema_compliance event history
 * rather than an ad hoc rolling average seeded off whatever the field
 * previously held.
 */
export async function onValidationComplete(
  agentId: string,
  taskId: string,
  score: number,
) {
  await recordReputationEvent({
    agentId,
    taskId,
    type: "schema_compliance",
    scoreDelta: score >= 80 ? 1 : -1,
    reason: `Artifact validation scored ${score}`,
  });
  await recalcAgentDerivedStats(agentId);
}

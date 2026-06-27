import { prisma } from "./prisma";
import { clamp } from "./utils";
import type { ReputationEventType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Reputation engine.
//
// reputationScore is event-driven and incremental: each ReputationEvent nudges
// the agent's score by a delta (clamped to 0..100), which preserves seeded
// baselines while letting activity move the needle. Derived stats
// (averageRating, completionRate, disputeRate, totalTasksCompleted) are
// recomputed from source data.
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

  if (delta !== 0) {
    const agent = await prisma.agent.findUnique({
      where: { id: args.agentId },
      select: { reputationScore: true },
    });
    if (agent) {
      await prisma.agent.update({
        where: { id: args.agentId },
        data: { reputationScore: clamp(agent.reputationScore + delta, 0, 100) },
      });
    }
  }
  return delta;
}

/** Recompute averageRating, completionRate, disputeRate, totalTasksCompleted. */
export async function recalcAgentDerivedStats(agentId: string) {
  const [reviews, grouped] = await Promise.all([
    prisma.review.findMany({ where: { agentId }, select: { rating: true } }),
    prisma.task.groupBy({
      by: ["status"],
      where: { sellerAgentId: agentId },
      _count: { _all: true },
    }),
  ]);

  const totalAssigned = grouped.reduce((sum, g) => sum + g._count._all, 0);
  const completed = grouped.find((g) => g.status === "completed")?._count._all ?? 0;
  const disputed = grouped.find((g) => g.status === "disputed")?._count._all ?? 0;

  const averageRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  const completionRate = totalAssigned ? completed / totalAssigned : 0;
  const disputeRate = totalAssigned ? disputed / totalAssigned : 0;

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      averageRating: Number(averageRating.toFixed(2)),
      completionRate: Number(completionRate.toFixed(3)),
      disputeRate: Number(disputeRate.toFixed(3)),
      totalTasksCompleted: completed,
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

/** Records schema compliance and nudges the rolling schemaComplianceScore. */
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
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { schemaComplianceScore: true },
  });
  if (agent) {
    const prev = agent.schemaComplianceScore || score;
    const rolling = Number((prev * 0.7 + score * 0.3).toFixed(1));
    await prisma.agent.update({
      where: { id: agentId },
      data: { schemaComplianceScore: rolling },
    });
  }
}

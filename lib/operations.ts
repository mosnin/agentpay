import "server-only";
import { prisma } from "@/lib/prisma";
/** Called only behind requireAdmin. Counts are facts from product records, not analytics pings. */
export async function getOperationsData(now = new Date()) {
  const dayAgo = new Date(now.getTime() - 86400000);
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const stale = new Date(now.getTime() - 15 * 60000);
  const [
    accounts,
    onboarded,
    buyers,
    sellers,
    recentAccounts,
    recentBuyers,
    completedLive,
    overdue,
    fundingRecovery,
    outbox,
    claims,
    chains,
    disputes,
    jobs,
    runs,
    deadLetters,
    successfulBuyers,
  ] = await Promise.all([
    prisma.user.count({ where: { clerkId: { not: null } } }),
    prisma.user.count({
      where: { clerkId: { not: null }, onboardedAt: { not: null } },
    }),
    prisma.user.count({
      where: { clerkId: { not: null }, tasks: { some: {} } },
    }),
    prisma.user.count({
      where: { clerkId: { not: null }, agents: { some: { status: "active" } } },
    }),
    prisma.user.count({
      where: { clerkId: { not: null }, createdAt: { gte: weekAgo } },
    }),
    prisma.user.count({
      where: {
        clerkId: { not: null },
        tasks: { some: { createdAt: { gte: weekAgo } } },
      },
    }),
    prisma.task.count({
      where: {
        status: "completed",
        completedAt: { gte: weekAgo },
        OR: [
          {
            payment: { provider: "stripe", livemode: true, status: "released" },
          },
          { paymentOrder: { livemode: true, state: "released" } },
        ],
      },
    }),
    prisma.task.findMany({
      where: {
        status: { in: ["pending", "accepted", "running", "submitted"] },
        deadline: { lt: now },
        fundedAt: { not: null },
      },
      select: { id: true, title: true, status: true, deadline: true },
      orderBy: { deadline: "asc" },
      take: 25,
    }),
    prisma.payment.findMany({
      where: {
        OR: [
          { operation: { not: null }, operationStartedAt: { lt: stale } },
          { status: "failed" },
        ],
      },
      select: { taskId: true, status: true, operation: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: 25,
    }),
    prisma.taskOutbox.aggregate({
      where: { deliveredAt: null, nextAttemptAt: { lt: now } },
      _count: { _all: true },
      _min: { createdAt: true },
    }),
    prisma.task.count({
      where: {
        workerLeaseUntil: { lt: now },
        status: { in: ["accepted", "running"] },
      },
    }),
    prisma.chainCursor.findMany({
      select: { id: true, halted: true, updatedAt: true },
      take: 20,
    }),
    prisma.dispute.count({
      where: {
        status: { in: ["open", "reviewing"] },
        createdAt: { lt: dayAgo },
      },
    }),
    prisma.operationJob.findMany({ take: 10, orderBy: { id: "asc" } }),
    prisma.operationRun.findMany({
      take: 30,
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    }),
    prisma.taskOutbox.findMany({
      where: { deliveredAt: null, attempts: { gte: 8 } },
      select: { id: true, taskId: true, attempts: true, createdAt: true },
      take: 25,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.user.count({
      where: {
        clerkId: { not: null },
        tasks: {
          some: {
            status: "completed",
            OR: [
              {
                payment: {
                  provider: "stripe",
                  livemode: true,
                  status: "released",
                },
              },
              { paymentOrder: { livemode: true, state: "released" } },
            ],
          },
        },
      },
    }),
  ]);
  return {
    jobs,
    runs,
    deadLetters,
    successfulBuyers,
    measuredAt: now,
    accounts,
    onboarded,
    buyers,
    sellers,
    recentAccounts,
    recentBuyers,
    completedLive,
    overdue,
    fundingRecovery,
    outbox,
    claims,
    chains,
    disputes,
  };
}

import "server-only";
import { prisma } from "@/lib/prisma";
import { trustReport, TRUST_WINDOW_DAYS, type TrustJob } from "./model";
export async function getTrustReport(userId: string, agentId?: string) {
  const jobs = await prisma.task.findMany({
    where: {
      ...(agentId
        ? { sellerAgentId: agentId }
        : { OR: [{ buyerId: userId }, { sellerAgent: { ownerId: userId } }] }),
      createdAt: { gte: new Date(Date.now() - TRUST_WINDOW_DAYS * 86400000) },
    },
    include: {
      buyer: { select: { organizationId: true } },
      sellerAgent: {
        select: { ownerId: true, owner: { select: { organizationId: true } } },
      },
      payment: true,
      paymentOrder: true,
      reviews: true,
      disputes: true,
      trustFindings: { where: { supersededAt: null } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const data: TrustJob[] = jobs.flatMap((j) =>
    !j.sellerAgent
      ? []
      : [
          {
            id: j.id,
            buyerId: j.buyerId,
            sellerId: j.sellerAgent.ownerId,
            buyerOrganizationId: j.buyer.organizationId,
            sellerOrganizationId: j.sellerAgent.owner.organizationId,
            confirmedLiveFunding: Boolean(
              (j.payment?.provider === "stripe" &&
                j.payment.livemode &&
                j.payment.stripeChargeId &&
                j.fundedAt) ||
                (j.paymentOrder?.livemode &&
                  j.paymentOrder.fundedAt &&
                  [
                    "funded",
                    "submitted",
                    "disputed",
                    "released",
                    "refunded",
                  ].includes(j.paymentOrder.state)),
            ),
            fundedAt: j.fundedAt ?? j.paymentOrder?.fundedAt ?? null,
            acceptedAt: j.acceptedAt,
            submittedAt: j.firstSubmittedAt,
            completedAt: j.completedAt,
            status: j.status,
            deadline: j.deadline,
            buyerRespondedAt:
              [
                j.completedAt,
                ...j.disputes
                  .filter((d) => d.openedById === j.buyerId)
                  .map((d) => d.createdAt),
              ]
                .filter(
                  (x): x is Date =>
                    !!x && (!j.firstSubmittedAt || x >= j.firstSubmittedAt),
                )
                .sort((a, b) => a.getTime() - b.getTime())[0] ?? null,
            rating:
              j.reviews.find((r) => r.userId === j.buyerId)?.rating ?? null,
            findings: j.trustFindings.map((f) => ({
              subjectUserId: f.subjectUserId,
              outcome: f.outcome,
              createdAt: f.createdAt,
            })),
          },
        ],
  );
  return {
    ...trustReport(userId, data),
    historyLimit: 1000,
    historyLimited: jobs.length === 1000,
  };
}

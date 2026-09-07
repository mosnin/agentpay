import { pageNumber } from "@/lib/pagination";
import { Pagination } from "@/components/shared/pagination";
import { SiteShell } from "@/components/layout/site-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrustModeration } from "@/components/trust/moderation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireAdmin();
  const page = pageNumber((await searchParams).page);
  const [caseCount, appealCount] = await Promise.all([
    prisma.dispute.count({
      where: {
        status: { in: ["resolved", "rejected"] },
        task: {
          buyerId: { not: user.id },
          sellerAgent: { ownerId: { not: user.id } },
        },
      },
    }),
    prisma.trustAppeal.count({ where: { state: "open" } }),
  ]);
  const disputes = await prisma.dispute.findMany({
    where: {
      status: { in: ["resolved", "rejected"] },
      task: {
        buyerId: { not: user.id },
        sellerAgent: { ownerId: { not: user.id } },
      },
    },
    include: {
      task: {
        include: { buyer: true, sellerAgent: { include: { owner: true } } },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: 25,
    skip: (page - 1) * 25,
  });
  const appeals = await prisma.trustAppeal.findMany({
    where: { state: "open" },
    include: { finding: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 25,
    skip: (page - 1) * 25,
  });
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
        <header>
          <p className="text-sm text-muted-foreground">
            Network administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Trust findings and appeals
          </h1>
        </header>
        <TrustModeration
          cases={disputes.map((d) => ({
            id: d.id,
            taskId: d.taskId,
            title: d.task.title,
            resolution: d.resolution,
            participants: [
              {
                id: d.task.buyerId,
                name: `Buyer: ${d.task.buyer.name || "Member"}`,
              },
              ...(d.task.sellerAgent
                ? [
                    {
                      id: d.task.sellerAgent.ownerId,
                      name: `Seller: ${d.task.sellerAgent.owner.name || "Member"}`,
                    },
                  ]
                : []),
            ],
          }))}
          appeals={appeals.map((a) => ({
            id: a.id,
            reason: a.reason,
            finding: {
              publicReason: a.finding.publicReason,
              outcome: a.finding.outcome,
            },
          }))}
        />
        <Pagination
          page={page}
          total={Math.max(caseCount, appealCount)}
          pageSize={25}
          pathname="/admin/trust"
        />
      </div>
    </SiteShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pageNumber } from "@/lib/pagination";
import { Pagination } from "@/components/shared/pagination";
import { SiteShell } from "@/components/layout/site-shell";
import { ReviewCard } from "@/components/shared/review-card";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params,
    page = pageNumber((await searchParams).page);
  const agent = await prisma.agent.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, name: true, slug: true },
  });
  if (!agent) notFound();
  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { agentId: agent.id },
      include: { user: { select: { name: true, image: true } } },
      take: 25,
      skip: (page - 1) * 25,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    prisma.review.count({ where: { agentId: agent.id } }),
  ]);
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <Link className="text-sm underline" href={`/agents/${agent.slug}`}>
          Back to {agent.name}
        </Link>
        <h1 className="text-3xl font-semibold">Reviews · {total}</h1>
        {reviews.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
        {reviews.length === 0 && <p>No reviews on this page.</p>}
        <Pagination
          page={page}
          total={total}
          pageSize={25}
          pathname={`/agents/${agent.slug}/reviews`}
        />
      </main>
    </SiteShell>
  );
}

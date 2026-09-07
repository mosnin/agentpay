import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { pageNumber } from "@/lib/pagination";
import { SaveAgent } from "@/components/agents/save-agent";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireOnboardedUser(),
    page = pageNumber((await searchParams).page);
  const [saved, total] = await Promise.all([
    prisma.savedAgent.findMany({
      where: { userId: user.id },
      take: 25,
      skip: (page - 1) * 25,
      orderBy: [{ createdAt: "desc" }, { agentId: "asc" }],
    }),
    prisma.savedAgent.count({ where: { userId: user.id } }),
  ]);
  const agents = await prisma.agent.findMany({
    where: { id: { in: saved.map((s) => s.agentId) } },
    select: { id: true, slug: true, name: true, shortDescription: true },
  });
  return (
    <AppShell isAdmin={user.role === "admin"}>
      <PageHeader
        title="Saved agents"
        description="Return to the services you want to work with."
      />
      {saved.length === 0 && (
        <p>
          No saved agents yet.{" "}
          <Link href="/marketplace" className="underline">
            Explore the marketplace
          </Link>
          .
        </p>
      )}
      <ul className="divide-y">
        {saved.map((s) => {
          const a = agents.find((a) => a.id === s.agentId);
          return (
            a && (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-4 py-5"
              >
                <div>
                  <Link
                    href={`/agents/${a.slug}`}
                    className="font-medium underline"
                  >
                    {a.name}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.shortDescription}
                  </p>
                </div>
                <SaveAgent agentId={a.id} initialSaved />
              </li>
            )
          );
        })}
      </ul>
      <Pagination
        page={page}
        total={total}
        pageSize={25}
        pathname="/settings/saved-agents"
      />
    </AppShell>
  );
}

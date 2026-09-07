import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTrustReport } from "@/lib/trust/queries";
import { SiteShell } from "@/components/layout/site-shell";
import { TrustReportPanel } from "@/components/trust/trust-report";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const u = await prisma.user.findUnique({
    where: { id },
    select: { name: true, publicTrustProfile: true },
  });
  if (!u?.publicTrustProfile) notFound();
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <h1 className="text-3xl font-semibold">
          {u.name || "Bids member"} · Trust history
        </h1>
        <TrustReportPanel report={await getTrustReport(id)} />
      </div>
    </SiteShell>
  );
}

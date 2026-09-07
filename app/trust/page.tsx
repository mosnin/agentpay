import { pageNumber } from "@/lib/pagination";
import { Pagination } from "@/components/shared/pagination";
import Link from "next/link";
import { SiteShell } from "@/components/layout/site-shell";
import { getCurrentUser } from "@/lib/auth";
import { getTrustReport } from "@/lib/trust/queries";
import { TrustReportPanel } from "@/components/trust/trust-report";
import { TrustPrivacy, FindingAppeal } from "@/components/trust/trust-controls";
import { prisma } from "@/lib/prisma";
export const metadata = {
  title: "Trust network",
  description:
    "Trust built from funded agreements, real delivery and transparent evidence.",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageNumber((await searchParams).page);
  const user = await getCurrentUser();
  const total = user
    ? await prisma.trustFinding.count({
        where: { subjectUserId: user.id, supersededAt: null },
      })
    : 0;
  const report = user ? await getTrustReport(user.id) : null;
  const findings = user
    ? await prisma.trustFinding.findMany({
        where: { subjectUserId: user.id, supersededAt: null },
        include: { appeals: true },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * 30,
        take: 30,
      })
    : [];
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-sm font-medium text-muted-foreground">
            Bids trust network
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Trust grows through work.
          </h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            People and agents build a shared history of agreements, delivery and
            payment. See the evidence behind a score before deciding who to work
            with.
          </p>
        </header>
        {report && user ? (
          <>
            <TrustReportPanel report={report} />
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Your public profile</h2>
              <TrustPrivacy enabled={user.publicTrustProfile} />
              {user.publicTrustProfile && (
                <Link
                  className="inline-flex min-h-11 items-center underline"
                  href={`/people/${user.id}`}
                >
                  View your public profile
                </Link>
              )}
            </section>
            {findings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold">
                  Findings and corrections
                </h2>
                <div className="mt-4 space-y-4">
                  {findings.map((f) => (
                    <article key={f.id} className="rounded-xl border p-5">
                      <p className="font-medium">
                        {f.outcome === "breach"
                          ? "Agreement breach"
                          : "Cleared finding"}
                      </p>
                      <p className="mt-2 text-sm">{f.publicReason}</p>
                      <Link
                        href={`/tasks/${f.taskId}`}
                        className="inline-flex min-h-11 items-center text-sm underline"
                      >
                        View agreement
                      </Link>
                      {f.appeals.length ? (
                        <p className="text-sm">
                          Appeal: {f.appeals[0].state}. {f.appeals[0].response}
                        </p>
                      ) : (
                        <FindingAppeal findingId={f.id} />
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <Link
            href="/sign-in"
            className="inline-flex min-h-11 items-center font-medium underline"
          >
            Sign in to see your trust history
          </Link>
        )}
        <section id="methodology" className="max-w-3xl space-y-5 border-t pt-8">
          <h2 className="text-2xl font-semibold">How trust is calculated</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Seller trust combines delivery outcomes (40%), timeliness (20%),
            verified buyer feedback (25%) and agreement conduct (15%). Buyer
            trust combines review responsiveness (60%) and conduct (40%).
            Missing metrics are excluded and remaining weights are normalized.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Only confirmed live payments from the last 365 days count. Test
            transactions, self-dealing and known shared organizations are
            excluded. Each counterparty contributes at most one outcome per
            calendar month. A numeric score needs at least five eligible
            outcomes, three counterparties and two metrics with three
            observations each.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Evidence loses half its weight every 90 days. Each metric starts
            with two positive and two negative prior observations, so a few
            successful jobs cannot create a perfect score. The observed
            percentages above show actual weighted evidence before that
            adjustment. Confidence describes evidence volume and coverage,
            separately from the score.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Open disputes do not lower conduct scores. Only recorded decisions
            do, and affected people can request a correction. An observed missed
            deadline may still affect delivery metrics. Wallet wealth,
            nationality, identity documents, followers and token ownership are
            not scoring inputs. Scores describe marketplace behavior, do not
            guarantee future performance, and never automatically exclude new
            users.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Payment proves that an agreement was funded; it does not prove two
            accounts are independent. These controls limit obvious repeat
            trading, not every form of collusion. Inspect the sample size,
            deliverables and counterparty history when assessing a service.
          </p>
        </section>
        {user && (
          <Pagination
            page={page}
            total={total}
            pageSize={30}
            pathname="/trust"
          />
        )}
      </div>
    </SiteShell>
  );
}

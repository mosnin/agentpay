import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getOperationsData } from "@/lib/operations";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
export const metadata = { title: "Product operations" };
export default async function OperationsPage() {
  try {
    await requireAdmin();
  } catch {
    notFound();
  }
  const data = await getOperationsData();
  const metrics = [
    ["Registered accounts", data.accounts],
    ["Onboarding completed", data.onboarded],
    ["Accounts with a request", data.buyers],
    ["Accounts with an active listing", data.sellers],
    ["New accounts · 7 days", data.recentAccounts],
    ["Requesting buyers · 7 days", data.recentBuyers],
    ["Live paid completions · 7 days", data.completedLive],
  ] as const;
  return (
    <AppShell isAdmin>
      <PageHeader
        title="Product operations"
        description="Saved product activity and work that needs recovery."
      />
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold">Recovery queue</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Counts reflect current records. Inspect the task before retrying any
            payment operation.
          </p>
          <dl className="mt-4 divide-y">
            {[
              ["Queued events ready for retry", data.outbox._count._all],
              ["Expired worker claims", data.claims],
              ["Disputes older than 24 hours", data.disputes],
            ].map(([label, count]) => (
              <div
                key={label}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <dt>{label}</dt>
                <dd className="font-medium tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 font-medium">Overdue funded work</h3>
          {data.overdue.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No overdue funded tasks.
            </p>
          ) : (
            <ul className="mt-2 divide-y">
              {data.overdue.map((t) => (
                <li key={t.id} className="py-3 text-sm">
                  <Link
                    className="underline underline-offset-4"
                    href={`/tasks/${t.id}`}
                  >
                    {t.title}
                  </Link>
                  <p className="mt-1 text-muted-foreground">
                    {t.status} · due {t.deadline?.toISOString().slice(0, 10)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-6 font-medium">Payment recovery</h3>
          {data.fundingRecovery.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No failed or stale payment operations.
            </p>
          ) : (
            <ul className="mt-2 divide-y">
              {data.fundingRecovery.map((p) => (
                <li key={p.taskId} className="break-words py-3 text-sm">
                  <Link
                    className="underline underline-offset-4"
                    href={`/tasks/${p.taskId}`}
                  >
                    {p.operation ?? "Failed payment"} · {p.taskId}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Showing up to 25 tasks in each recovery list, oldest first.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Adoption</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Authenticated accounts only. Request and listing counts do not imply
            payment or successful delivery.
          </p>
          <dl className="mt-4 divide-y">
            {metrics.map(([label, count]) => (
              <div
                key={label}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <dt>{label}</dt>
                <dd className="font-medium tabular-nums">
                  {count.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h2 className="text-xl font-semibold">Chain reconciliation</h2>
          {data.chains.length ? (
            <ul className="mt-4 space-y-3">
              {data.chains.map((c) => (
                <li key={c.id} className="break-words text-sm">
                  {c.id} · {c.halted ? "Halted — investigate" : "Cursor saved"}
                  <p className="text-xs text-muted-foreground">
                    Last updated {c.updatedAt.toISOString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No chain reconciliation has been recorded.
            </p>
          )}
        </section>
        <p className="text-xs text-muted-foreground">
          Measured {data.measuredAt.toISOString()} ·{" "}
          <Link href="/admin" className="underline">
            Moderation and disputes
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

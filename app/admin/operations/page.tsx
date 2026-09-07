import { retryOutbox } from "@/lib/actions/operations";
import { Button } from "@/components/ui/button";
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
          <h2 className="text-xl font-semibold">Scheduled operations</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A gap longer than 15 minutes or a failed run needs attention. Runs
            that outlive their lease are recovered on the next invocation.
          </p>
          <ul className="mt-4 divide-y">
            {["settlements", "verify"].map((id) => {
              const job = data.jobs.find((j) => j.id === id);
              const overdue =
                !job?.lastSuccessAt ||
                data.measuredAt.getTime() - job.lastSuccessAt.getTime() >
                  900000;
              return (
                <li className="py-3 text-sm" key={id}>
                  {id} ·{" "}
                  {overdue
                    ? "Attention: no recent successful run"
                    : "Running on schedule"}
                  <p className="text-muted-foreground">
                    Last success: {job?.lastSuccessAt?.toISOString() ?? "Never"}
                  </p>
                </li>
              );
            })}
          </ul>
          <details className="mt-4">
            <summary className="cursor-pointer py-3">
              Recent run history
            </summary>
            <ul className="divide-y">
              {data.runs.map((r) => (
                <li key={r.id} className="py-3 text-sm">
                  {r.jobId} · {r.state} · {r.startedAt.toISOString()}
                  <p className="text-muted-foreground">
                    {r.summary ?? "Awaiting completion"}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        </section>
        <section>
          <h2 className="text-xl font-semibold">
            Notifications requiring recovery
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Delivery stops after eight failed attempts. Retry queues the
            notification again; it never repeats a payment.
          </p>
          {data.deadLetters.length === 0 ? (
            <p className="mt-3 text-sm">No exhausted notification retries.</p>
          ) : (
            <ul className="divide-y">
              {data.deadLetters.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <Link
                    className="break-all underline"
                    href={`/tasks/${e.taskId}`}
                  >
                    {e.taskId}
                  </Link>
                  <form action={retryOutbox}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button type="submit" variant="outline">
                      Retry notification
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

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
          <p className="mt-3 text-sm">
            First live paid delivery: {data.successfulBuyers} of {data.buyers}{" "}
            requesting accounts (
            {data.buyers
              ? ((100 * data.successfulBuyers) / data.buyers).toFixed(1)
              : "0"}
            %).
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

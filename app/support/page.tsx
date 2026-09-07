import { ActionForm } from "@/components/shared/action-form";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOnboardedUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { pageNumber } from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import {
  submitServiceReport,
  resolveServiceReport,
} from "@/lib/actions/support";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireOnboardedUser(),
    admin = user.role === "admin",
    page = pageNumber((await searchParams).page);
  const where = admin ? {} : { userId: user.id };
  const disputeWhere = admin
    ? {}
    : {
        task: {
          OR: [{ buyerId: user.id }, { sellerAgent: { ownerId: user.id } }],
        },
      };
  const options = {
    take: 25,
    skip: (page - 1) * 25,
    orderBy: [{ createdAt: "desc" as const }, { id: "asc" as const }],
  };
  const [reports, appeals, disputes, reportCount, appealCount, disputeCount] =
    await Promise.all([
      prisma.serviceReport.findMany({ where, ...options }),
      prisma.trustAppeal.findMany({
        where,
        ...options,
        select: {
          id: true,
          reason: true,
          response: true,
          state: true,
          createdAt: true,
        },
      }),
      prisma.dispute.findMany({
        where: disputeWhere,
        ...options,
        select: {
          id: true,
          taskId: true,
          reason: true,
          status: true,
          resolution: true,
        },
      }),
      prisma.serviceReport.count({ where }),
      prisma.trustAppeal.count({ where }),
      prisma.dispute.count({ where: disputeWhere }),
    ]);
  const audit = await prisma.operationAudit.findMany({
    where: { targetId: { in: reports.map((r) => r.id) } },
    take: 100,
    orderBy: { createdAt: "desc" },
    select: { id: true, targetId: true, action: true, createdAt: true },
  });
  return (
    <AppShell isAdmin={admin}>
      <PageHeader
        title={admin ? "Support operations" : "Support"}
        description="Track service reports, task disputes and trust appeals in one place."
      />
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold">Report a service issue</h2>
          <ActionForm
            action={submitServiceReport}
            successMessage="Report saved. You can track its status below."
            className="mt-4 max-w-2xl space-y-4"
          >
            <label className="block text-sm">
              Subject
              <input
                required
                minLength={5}
                maxLength={180}
                name="subject"
                className="mt-2 w-full rounded-md border bg-background p-3"
              />
            </label>
            <label className="block text-sm">
              Task ID (optional)
              <input
                name="taskId"
                maxLength={100}
                className="mt-2 w-full rounded-md border bg-background p-3"
              />
            </label>
            <label className="block text-sm">
              What happened?
              <textarea
                required
                minLength={20}
                maxLength={5000}
                name="detail"
                rows={4}
                className="mt-2 w-full rounded-md border bg-background p-3"
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Visible to you and platform support. Do not include passwords,
              wallet keys or payment credentials. Payment disputes must be
              opened from the task.
            </p>
            <Button type="submit">Submit report</Button>
          </ActionForm>
        </section>
        <section>
          <h2 className="text-xl font-semibold">
            Service reports · {reportCount}
          </h2>
          <ul className="divide-y">
            {reports.map((r) => (
              <li key={r.id} className="space-y-3 py-5">
                <h3 className="font-medium">
                  {r.subject} · {r.state}
                </h3>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {r.detail}
                </p>
                {r.taskId && (
                  <Link
                    className="text-sm underline"
                    href={`/tasks/${r.taskId}`}
                  >
                    Open task
                  </Link>
                )}
                {r.response && (
                  <p className="whitespace-pre-wrap text-sm">
                    Support response: {r.response}
                  </p>
                )}
                <details>
                  <summary className="py-2 text-sm">History</summary>
                  {audit
                    .filter((a) => a.targetId === r.id)
                    .map((a) => (
                      <p key={a.id} className="text-xs text-muted-foreground">
                        {a.createdAt.toISOString()} ·{" "}
                        {a.action.replaceAll("_", " ")}
                      </p>
                    ))}
                </details>
                {admin && (
                  <ActionForm
                    action={resolveServiceReport}
                    successMessage="Response saved."
                    className="space-y-3"
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <label className="block text-sm">
                      Response
                      <textarea
                        name="response"
                        required
                        minLength={10}
                        maxLength={3000}
                        rows={3}
                        className="mt-2 w-full rounded-md border bg-background p-3"
                      />
                    </label>
                    <label className="block text-sm">
                      Status
                      <select
                        name="state"
                        className="ml-3 rounded-md border bg-background p-3"
                      >
                        <option value="reviewing">Reviewing</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </label>
                    <Button type="submit" variant="outline">
                      Save response
                    </Button>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
          {!reports.length && (
            <p className="mt-3 text-sm text-muted-foreground">
              No reports on this page.
            </p>
          )}
        </section>
        <section>
          <h2 className="text-xl font-semibold">
            Task disputes · {disputeCount}
          </h2>
          <ul className="divide-y">
            {disputes.map((d) => (
              <li key={d.id} className="py-4 text-sm">
                <Link className="underline" href={`/tasks/${d.taskId}`}>
                  {d.reason}
                </Link>{" "}
                · {d.status}
                {d.resolution && <p className="mt-2">{d.resolution}</p>}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-semibold">
            Trust appeals · {appealCount}
          </h2>
          <ul className="divide-y">
            {appeals.map((a) => (
              <li key={a.id} className="py-4 text-sm">
                {a.reason} · {a.state}
                {a.response && <p className="mt-2">{a.response}</p>}
              </li>
            ))}
          </ul>
          <Link
            className="mt-3 inline-block text-sm underline"
            href={admin ? "/admin/trust" : "/trust"}
          >
            {admin
              ? "Review trust findings and appeals"
              : "View your trust findings and appeal"}
          </Link>
        </section>
        <Pagination
          page={page}
          total={Math.max(reportCount, appealCount, disputeCount)}
          pageSize={25}
          pathname="/support"
        />
      </div>
    </AppShell>
  );
}

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { performance } from "node:perf_hooks";
import fs from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  requireUser: async () => ({ id: "scale-user-1" }),
}));
const run = process.env.BIDS_SCALE_TEST === "1";
describe.skipIf(!run)("10,000 accounts and 100,000 task records", () => {
  let db: typeof import("@/lib/prisma").prisma;
  let queries: typeof import("@/lib/queries");
  const timings: Record<string, number[]> = {};
  async function timed<T>(label: string, fn: () => Promise<T>) {
    const start = performance.now();
    const value = await fn();
    (timings[label] ??= []).push(performance.now() - start);
    return value;
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.pathname !== "/bids_scale"
    )
      throw new Error("Use an isolated loopback database named bids_scale");
    db = (await import("@/lib/prisma")).prisma;
    if (await db.user.count())
      throw new Error(
        "Scale fixture requires an empty database; it will not delete existing data",
      );
    queries = await import("@/lib/queries");
    await db.$executeRaw`INSERT INTO "User" (id,email,"clerkId","updatedAt") SELECT 'scale-user-'||i, 'scale-'||i||'@example.invalid', 'fixture-clerk-'||i, now() FROM generate_series(1,10000) i`;
    await db.$executeRaw`INSERT INTO "Agent" (id,name,slug,"shortDescription","longDescription",category,"ownerId","updatedAt") SELECT 'scale-agent-'||i, 'Data profiler '||i, 'scale-agent-'||i, 'Profile CSV data', 'Return a structured CSV data profile', 'Data', 'scale-user-'||(9001 + ((i-1) % 1000)), now() FROM generate_series(1,2000) i`;
    await db.$executeRaw`INSERT INTO "Task" (id,title,objective,category,status,"buyerId","sellerAgentId",budget,"updatedAt") SELECT 'scale-task-'||i, 'Profile data '||i, 'Return a profile', 'Data', CASE WHEN i <= 10000 THEN 'completed'::"TaskStatus" ELSE 'pending'::"TaskStatus" END, 'scale-user-'||(1+((i-1)%10000)), 'scale-agent-'||(1+((i-1)%2000)), 10, now() FROM generate_series(1,100000) i`;
    await db.$executeRaw`INSERT INTO "Payment" (id,"taskId",amount,provider,status,"updatedAt") SELECT 'scale-payment-'||i,'scale-task-'||i,10,'mock','released',now() FROM generate_series(1,10000) i`;
    await db.$executeRaw`ANALYZE`;
  }, 120000);
  afterAll(async () => {
    if (db) await db.$disconnect();
    if (process.env.BIDS_SCALE_REPORT)
      fs.writeFileSync(
        process.env.BIDS_SCALE_REPORT,
        JSON.stringify(
          {
            accounts: 10000,
            agents: 2000,
            tasks: 100000,
            concurrentReaders: 20,
            milliseconds: timings,
          },
          null,
          2,
        ),
      );
  });
  it("returns accurate personal totals without exposing the global task activity", async () => {
    const result = await timed("dashboard", () =>
      queries.getDashboardData("scale-user-1"),
    );
    expect(result.stats.activeTasks).toBe(9);
    expect(result.stats.tasksCompleted).toBe(1);
    expect(result.stats.totalSpend).toBe(10);
    expect(result.charts.taskVolume.reduce((s, d) => s + d.tasks, 0)).toBe(10);
    expect(result.charts.reputationTrend).toEqual([]);
    expect(result.recentTasks.length).toBeLessThanOrEqual(6);
  });
  it("enumerates catalog pages deterministically with equal ranking values", async () => {
    const a = await timed("catalog", () => queries.getAgentsPaginated({}, 1));
    const b = await timed("catalog-page-2", () =>
      queries.getAgentsPaginated({}, 2),
    );
    expect(a.total).toBe(2000);
    expect(a.agents).toHaveLength(24);
    expect(new Set([...a.agents, ...b.agents].map((a) => a.id)).size).toBe(48);
    const options = await queries.getAgentSelectOptions("Data profiler 1999");
    expect(options.some((a) => a.id === "scale-agent-1999")).toBe(true);
    expect((await queries.getAgentSelectOptions()).length).toBeLessThanOrEqual(
      20,
    );
  });
  it("returns seller totals across all history while paging only the visible work", async () => {
    const seller = await timed("seller", () =>
      queries.getSellerData("scale-user-9001"),
    );
    expect(seller.stats.agentCount).toBe(2);
    expect(seller.taskCount).toBe(100);
    expect(seller.inboundTasks).toHaveLength(25);
    expect(seller.stats.openInbound).toBe(90);
    expect(seller.stats.totalEarnings).toBe(100);
  });
  it("serves bounded lists with 20 concurrent readers", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        timed("concurrent-catalog", () =>
          queries.getAgentsPaginated({ q: "data" }, i + 1),
        ),
      ),
    );
    expect(
      results.every((r) => r.agents.length === 24 && r.total === 2000),
    ).toBe(true);
    // Generous regression budget for shared CI hardware; results are measurements, not a capacity claim.
    expect(Math.max(...timings["concurrent-catalog"])).toBeLessThan(5000);
  }, 15000);
  it("rotates failed verification attempts so later listings are checked", async () => {
    vi.stubEnv("CRON_SECRET", "scale-only-secret");
    const { GET } = await import("@/app/api/cron/verify/route");
    for (let i = 0; i < 2; i++) {
      const response = await GET(
        new Request("http://localhost/api/cron/verify", {
          headers: { authorization: "Bearer scale-only-secret" },
        }),
      );
      expect(response.status).toBe(200);
      expect((await response.json()).checked).toBe(25);
    }
    expect(
      await db.agent.count({
        where: { lastVerificationAttemptAt: { not: null } },
      }),
    ).toBe(50);
    vi.unstubAllEnvs();
  });
  it("reports confirmed seller token credits without including fees or test funds", async () => {
    for (const [i, live, credit] of [[1, true, 95000000n], [2001, false, 990000000n], [4001, true, 30000000n]] as const) {
      const order = await db.paymentOrder.create({ data: {
        taskId: `scale-task-${i}`, jobKey: `scale-order-${i}`, network: "eip155:8453", token: "0xtoken", symbol: "USDC", decimals: 6,
        escrow: "0xescrow", treasury: "0xtreasury", arbiter: "0xarbiter", buyerAddress: "0xbuyer", sellerAddress: "0xseller",
        totalUnits: 100000000n, feeUnits: 5000000n, sellerUnits: 95000000n, feeBps: 500, feeMode: "deduct", deliverBy: new Date(), reviewSeconds: 3600, disputeSeconds: 3600, termsHash: "fixture", livemode: live,
      } });
      await db.ledgerEntry.createMany({ data: [
        { orderId: order.id, eventKey: `scale-${i}-seller`, network: order.network, token: order.token, debitAccount: `escrow:${order.id}`, creditAccount: "wallet:0xseller", amountUnits: credit, transactionHash: `0xfixture${i}` },
        { orderId: order.id, eventKey: `scale-${i}-fee`, network: order.network, token: order.token, debitAccount: `escrow:${order.id}`, creditAccount: "treasury:0xtreasury", amountUnits: 5000000n, transactionHash: `0xfixture${i}` },
      ] });
    }
    const { getStablecoinEarnings } = await import("@/lib/settlement/earnings");
    const result = await getStablecoinEarnings("scale-user-9001");
    expect(result).toHaveLength(1);
    expect(result[0].units).toBe("125000000");
    expect(await getStablecoinEarnings("scale-user-2")).toEqual([]);
  });
  it("persists onboarding once under competing submissions", async () => {
    const { completeOnboarding } = await import("@/lib/actions/onboarding");
    const payload = {
      intent: "seller",
      organizationMode: "create",
      organizationName: "Scale test org",
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () => completeOnboarding(payload)),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await db.organization.count()).toBe(1);
  });
});

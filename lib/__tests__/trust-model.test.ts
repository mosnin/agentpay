import { describe, it, expect } from "vitest";
import { trustReport, type TrustJob } from "@/lib/trust/model";
const now = new Date("2026-09-06T12:00:00Z");
function job(i: number, patch: Partial<TrustJob> = {}): TrustJob {
  return {
    id: `job${i}`,
    buyerId: `buyer${i}`,
    sellerId: "seller",
    buyerOrganizationId: null,
    sellerOrganizationId: null,
    confirmedLiveFunding: true,
    status: "completed",
    fundedAt: new Date("2026-09-01"),
    acceptedAt: new Date("2026-09-01"),
    submittedAt: new Date("2026-09-02"),
    completedAt: new Date("2026-09-03"),
    deadline: new Date("2026-09-04"),
    buyerRespondedAt: new Date("2026-09-03"),
    rating: 5,
    findings: [],
    ...patch,
  };
}
describe("behavior-based trust", () => {
  it("does not invent a score for a new user", () =>
    expect(trustReport("new", [], now).seller).toMatchObject({
      score: null,
      confidence: "insufficient",
    }));
  it("excludes test funding, self-trades, same-organization and old history", () => {
    const r = trustReport(
      "seller",
      [
        job(1, { confirmedLiveFunding: false }),
        job(2, { buyerId: "seller" }),
        job(3, { buyerOrganizationId: "org", sellerOrganizationId: "org" }),
        job(4, { fundedAt: new Date("2024-01-01") }),
      ],
      now,
    );
    expect(r.eligibleJobs).toBe(0);
    expect(r.excludedJobs).toBe(4);
  });
  it("limits repeated counterparty influence", () => {
    const r = trustReport(
      "seller",
      Array.from({ length: 50 }, (_, i) => job(i, { buyerId: "same" })),
      now,
    );
    expect(r.seller.sampleCount).toBe(1);
    expect(r.seller.score).toBeNull();
  });
  it("requires independent history and never assigns 100 from five good jobs", () => {
    const r = trustReport(
      "seller",
      Array.from({ length: 5 }, (_, i) => job(i)),
      now,
    );
    expect(r.seller.score).toBeGreaterThan(50);
    expect(r.seller.score).toBeLessThan(100);
    expect(r.seller.confidence).toBe("limited");
  });
  it("missing deadlines and timestamps remain unknown", () => {
    const r = trustReport(
      "seller",
      Array.from({ length: 5 }, (_, i) =>
        job(i, { deadline: null, submittedAt: null }),
      ),
      now,
    );
    expect(r.seller.metrics.find((m) => m.key === "timing")?.rate).toBeNull();
  });
  it("only adjudicated breaches lower conduct, and cleared findings do not", () => {
    const rows = Array.from({ length: 5 }, (_, i) => job(i));
    const normal = trustReport("seller", rows, now).seller.score!;
    rows[0].findings = [
      { subjectUserId: "seller", outcome: "breach", createdAt: now },
    ];
    expect(trustReport("seller", rows, now).seller.score).toBeLessThan(normal);
    rows[0].findings[0].outcome = "cleared";
    expect(trustReport("seller", rows, now).seller.score).toBe(normal);
  });
  it("keeps buyer and seller performance separate", () => {
    const r = trustReport(
      "buyer",
      Array.from({ length: 5 }, (_, i) =>
        job(i, { buyerId: "buyer", sellerId: `seller${i}` }),
      ),
      now,
    );
    expect(r.buyer.score).not.toBeNull();
    expect(r.seller.score).toBeNull();
  });
  it("reduces certainty from old positive outcomes", () => {
    const fresh = Array.from({ length: 5 }, (_, i) => job(i));
    const old = fresh.map((j) => ({ ...j, fundedAt: new Date("2026-01-01") }));
    expect(trustReport("seller", old, now).seller.score).toBeLessThan(
      trustReport("seller", fresh, now).seller.score!,
    );
  });
  it("reports observed rates on a zero to one hundred scale", () => {
    const r = trustReport("seller", [job(1)], now);
    expect(r.seller.metrics.find((m) => m.key === "delivery")?.rate).toBe(100);
  });
  it("treats no-fault cancelled agreements as neutral", () => {
    const r = trustReport(
      "seller",
      [job(1, { status: "cancelled", completedAt: null, submittedAt: null })],
      now,
    );
    expect(r.seller.metrics.every((m) => m.samples === 0)).toBe(true);
  });
  it("does not penalize either participant for a no-fault refund after delivery", () => {
    const rows = [
      job(1, {
        status: "cancelled",
        completedAt: null,
        buyerRespondedAt: null,
      }),
    ];
    for (const user of ["buyer1", "seller"]) {
      const report = trustReport(user, rows, now);
      expect(report.buyer.metrics.every((m) => m.samples === 0)).toBe(true);
      expect(report.seller.metrics.every((m) => m.samples === 0)).toBe(true);
    }
    rows[0].findings = [
      { subjectUserId: "seller", outcome: "breach", createdAt: now },
    ];
    expect(
      trustReport("seller", rows, now).seller.metrics.find(
        (m) => m.key === "conduct",
      )?.rate,
    ).toBe(0);
    expect(trustReport("buyer1", rows, now).buyer.sampleCount).toBe(0);
  });
});

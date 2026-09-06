import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ payment: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn() }, task: { findUniqueOrThrow: vi.fn() }, stripe: { transfers: { create: vi.fn() }, refunds: { create: vi.fn() }, charges: { retrieve: vi.fn() }, checkout: { sessions: { create: vi.fn(), retrieve: vi.fn(), expire: vi.fn() } }, paymentIntents: { retrieve: vi.fn(), cancel: vi.fn() } } }));
vi.mock("@/lib/prisma", () => ({ prisma: { payment: mocks.payment, task: mocks.task } }));
vi.mock("@/lib/payments/stripe", () => ({ stripeClient: () => mocks.stripe, stripeLive: () => false, appOrigin: () => "http://localhost:3188", sellerReady: async () => true }));
import { releasePaymentForTask, refundPaymentForTask, checkoutForTask, ensureTaskFunded } from "@/lib/payments";
import { usdMinorUnits, paymentMode } from "@/lib/payment-mode";
import { apiCreateTaskSchema } from "@/lib/schemas";
const payment = { id: "pay_1", taskId: "task_1", status: "escrowed", provider: "stripe", amount: 12.34, amountMinor: 1234, livemode: false, currency: "USD", sellerAccountId: "acct_seller", stripeChargeId: "ch_1", stripePaymentIntentId: "pi_1", stripeSessionId: "cs_1", operation: null };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_BIDS_PAYMENT_MODE", "stripe");
  mocks.payment.findUnique.mockResolvedValue(payment); mocks.payment.findUniqueOrThrow.mockResolvedValue(payment);
  mocks.payment.updateMany.mockResolvedValue({ count: 1 }); mocks.payment.update.mockImplementation(async ({ data }) => ({ ...payment, ...data }));
  mocks.stripe.charges.retrieve.mockResolvedValue({ paid: true, disputed: false, amount_refunded: 0, amount: 1234, currency: "usd" });
});
describe("real provider payment boundary", () => {
  it("defaults new API agreements to pay per task in Stripe mode", () => { expect(apiCreateTaskSchema.parse({ objective: "Profile supplied records" }).payment_mode).toBe("pay_per_task"); });
  it("defaults to unavailable, never a pretend payment", () => { vi.stubEnv("NEXT_PUBLIC_BIDS_PAYMENT_MODE", ""); expect(paymentMode()).toBe("disabled"); });
  it.each([NaN, Infinity, -.01, .49, 1.005, 1000001])("rejects an invalid monetary amount %s", amount => expect(() => usdMinorUnits(amount)).toThrow());
  it("preserves exact cents", () => expect(usdMinorUnits(12.34)).toBe(1234));
  it("requires confirmed funding before execution", async () => { mocks.payment.findUnique.mockResolvedValue({ ...payment, status: "pending" }); await expect(ensureTaskFunded("task_1")).rejects.toThrow("funding"); });
  it("never releases a legacy mock payment in real mode", async () => { mocks.payment.findUniqueOrThrow.mockResolvedValue({ ...payment, provider: "x402_mock" }); await expect(releasePaymentForTask("task_1")).rejects.toThrow("Demo"); expect(mocks.stripe.transfers.create).not.toHaveBeenCalled(); });
  it("transfers exact funded amount to the recorded seller with stable idempotency", async () => {
    mocks.stripe.transfers.create.mockResolvedValue({ id: "tr_1" });
    const result = await releasePaymentForTask("task_1");
    expect(mocks.stripe.transfers.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 1234, destination: "acct_seller", source_transaction: "ch_1" }), { idempotencyKey: "bids-transfer-pay_1" });
    expect(result.status).toBe("released"); expect(result.stripeTransferId).toBe("tr_1");
  });
  it("does not mark a failed transfer released", async () => {
    mocks.stripe.transfers.create.mockRejectedValue(new Error("provider unavailable"));
    await expect(releasePaymentForTask("task_1")).rejects.toThrow();
    expect(mocks.payment.update.mock.calls.some(([arg]) => arg.data.status === "released")).toBe(false);
  });
  it("rejects a conflicting cancellation/transfer operation", async () => { mocks.payment.updateMany.mockResolvedValue({ count: 0 }); await expect(releasePaymentForTask("task_1")).rejects.toThrow("operation"); expect(mocks.stripe.transfers.create).not.toHaveBeenCalled(); });
  it("does not mark a pending refund completed", async () => {
    mocks.stripe.paymentIntents.retrieve.mockResolvedValue({ id: "pi_1", status: "succeeded" });
    mocks.stripe.refunds.create.mockResolvedValue({ id: "re_1", status: "pending" });
    await expect(refundPaymentForTask("task_1")).rejects.toThrow("pending");
    expect(mocks.payment.update.mock.calls.some(([arg]) => arg.data.status === "refunded")).toBe(false);
  });
  it("records only a provider-confirmed refund", async () => {
    mocks.stripe.paymentIntents.retrieve.mockResolvedValue({ id: "pi_1", status: "succeeded" });
    mocks.stripe.refunds.create.mockResolvedValue({ id: "re_1", status: "succeeded" });
    expect((await refundPaymentForTask("task_1"))?.status).toBe("refunded");
    expect(mocks.stripe.refunds.create).toHaveBeenCalledWith(expect.objectContaining({ payment_intent: "pi_1" }), { idempotencyKey: "bids-refund-pay_1" });
  });
  it("protects checkout from other users", async () => { mocks.task.findUniqueOrThrow.mockResolvedValue({ buyerId: "buyer", status: "pending", payment: { ...payment, status: "pending" } }); await expect(checkoutForTask("task_1", "stranger")).rejects.toThrow("buyer"); });
  it("reuses open checkout and does not duplicate funding", async () => { mocks.task.findUniqueOrThrow.mockResolvedValue({ buyerId: "buyer", status: "pending", payment: { ...payment, status: "pending" } }); mocks.stripe.checkout.sessions.retrieve.mockResolvedValue({ status: "open", url: "https://checkout.stripe.com/test" }); expect(await checkoutForTask("task_1", "buyer")).toContain("checkout.stripe.com"); expect(mocks.stripe.checkout.sessions.create).not.toHaveBeenCalled(); });
});

import { beforeEach, expect, it, vi } from "vitest";
import Stripe from "stripe";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/payments/events", () => ({ processPaymentEvent: vi.fn() }));
import { POST } from "@/app/api/webhooks/stripe/route";
import { processPaymentEvent } from "@/lib/payments/events";
const secret = "whsec_local_signature_test";
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_BIDS_PAYMENT_MODE", "stripe"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local_signature_only"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret); });
it("rejects unsigned and tampered funding events", async () => {
  const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed", data: { object: {} } });
  const stripe = new Stripe("sk_test_local_signature_only");
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  expect((await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: payload }))).status).toBe(400);
  expect((await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: payload + " ", headers: { "stripe-signature": signature } }))).status).toBe(400);
  expect(processPaymentEvent).not.toHaveBeenCalled();
});
it("accepts a valid signature and returns retryable failures for unprocessed events", async () => {
  const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed", data: { object: {} } });
  const signature = new Stripe("sk_test_local_signature_only").webhooks.generateTestHeaderString({ payload, secret });
  const request = () => new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": signature } });
  expect((await POST(request())).status).toBe(200);
  vi.mocked(processPaymentEvent).mockRejectedValueOnce(new Error("DB unavailable"));
  expect((await POST(request())).status).toBe(500);
});

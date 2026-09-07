import "server-only";
import Stripe from "stripe";
import { paymentMode } from "@/lib/payment-mode";

export function stripeClient() {
  if (
    !["stripe", "crypto"].includes(paymentMode()) ||
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET
  )
    throw new Error(
      "Payments are not configured. Connect Stripe and its signed webhook before accepting work.",
    );
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    timeout: 20000,
  });
}
export function stripeLive() {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ?? false;
}
export function appOrigin() {
  const url = new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  );
  if (stripeLive() && url.protocol !== "https:")
    throw new Error("Live checkout requires HTTPS.");
  return url.origin;
}
export async function sellerReady(accountId: string) {
  const account = await stripeClient().v2.core.accounts.retrieve(accountId, {
    include: ["configuration.recipient"],
  });
  return (
    account.configuration?.recipient?.capabilities?.stripe_balance
      ?.stripe_transfers?.status === "active"
  );
}

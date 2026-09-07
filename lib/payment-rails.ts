import "server-only";
import { paymentMode } from "./payment-mode";
import { publicNetworks } from "./settlement/networks";
export function availablePaymentRails(): ("stripe" | "crypto")[] {
  if (!["stripe", "crypto"].includes(paymentMode())) return [];
  const rails: ("stripe" | "crypto")[] = [];
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
    rails.push("stripe");
  if (publicNetworks().length || paymentMode() === "crypto")
    rails.push("crypto");
  return rails;
}

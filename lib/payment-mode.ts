export function paymentMode(): "stripe" | "demo" | "disabled" {
  const value = process.env.NEXT_PUBLIC_BIDS_PAYMENT_MODE;
  return value === "stripe" || value === "demo" ? value : "disabled";
}
export function paymentDisclosure() {
  if (paymentMode() === "demo") return "Demo payments only. No card is charged and no funds are transferred.";
  if (paymentMode() === "stripe") return "Fund this task through Stripe Checkout before work starts. Buyer approval transfers the agreed amount to the seller’s Stripe balance. Bank payout timing is managed by Stripe.";
  return "Checkout is not available yet. No payment is collected until the payment provider and seller payouts are connected.";
}
export function usdMinorUnits(amount: number): number {
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount < .5 || amount > 1000000 || Math.abs(amount * 100 - cents) > .000001) throw new Error("Enter a USD amount from $0.50 to $1,000,000 with at most two decimal places.");
  return cents;
}

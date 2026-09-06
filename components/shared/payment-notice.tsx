import { paymentDisclosure, paymentMode } from "@/lib/payment-mode";
export function PaymentNotice({ provider, livemode }: { provider?: string; livemode?: boolean } = {}) {
  const demo = provider ? provider !== "stripe" : paymentMode() === "demo";
  return <aside aria-label="Payment information" className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed">
    <p className="font-medium">{demo ? "Demo payment record" : provider === "stripe" && !livemode ? "Stripe test payment" : "Funding and seller payment"}</p>
    <p className="mt-1 text-muted-foreground">{demo ? "Payments are simulated. No card is charged, no crypto is transferred, and there is no withdrawable balance." : provider === "stripe" && !livemode ? "This task uses Stripe’s test environment. No real funds move. It follows the provider-backed checkout and transfer flow." : paymentDisclosure()}</p>
  </aside>;
}

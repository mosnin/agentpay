import { PAYMENT_DISCLOSURE } from "@/lib/task-experience";

export function PaymentNotice() {
  return <aside aria-label="Payment information" className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed">
    <p className="font-medium">A work agreement, with simulated payment</p>
    <p className="mt-1 text-muted-foreground">{PAYMENT_DISCLOSURE}</p>
  </aside>;
}

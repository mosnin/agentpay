import { SiteShell } from "@/components/layout/site-shell";
import { PaymentNotice } from "@/components/shared/payment-notice";
import { WorkflowGuide } from "./workflow-guide";
export const metadata = { title: "How Bids works", description: "Understand requests, agent execution, delivery review and simulated payments." };
export default function HowItWorksPage() {
  return <SiteShell><div className="mx-auto max-w-5xl [overflow-wrap:anywhere] px-4 py-10 sm:px-6 sm:py-14">
    <p className="text-sm font-medium text-muted-foreground">From request to result</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">One agreement. Clear responsibilities.</h1>
    <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">Bids coordinates the work. The seller operates the agent. The buyer decides when the delivered result is ready to approve.</p>
    <div className="my-8"><PaymentNotice /></div>
    <WorkflowGuide />
    <section className="mt-10 border-t border-border pt-8"><h2 className="text-xl font-semibold tracking-tight">What happens to the money?</h2><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Today, a budget creates a simulated escrow record. Approval changes that record to released and generates a mock receipt. Cancellation can record a simulated refund. None of these records represent a charge, a transfer, funds held in custody, or a seller payout.</p><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">A future live payment flow needs an actual payment provider, funding confirmation, settlement and refund handling. Bids will need to show those terms and obtain your approval before it can move real funds.</p></section>
  </div></SiteShell>;
}

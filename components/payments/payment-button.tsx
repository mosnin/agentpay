"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function PaymentButton({ taskId, amount }: { taskId: string; amount: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const router = useRouter();
  async function pay() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/payments/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error ?? "Checkout could not start.");
      const url = new URL(data.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Checkout returned an unexpected destination.");
      window.location.assign(url.href);
    } catch (e) { setError(e instanceof Error ? e.message : "Checkout could not start."); setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-border p-5" aria-label="Fund this task"><h2 className="font-semibold">Fund your agreement</h2><p className="text-sm text-muted-foreground">Pay {amount} through Stripe before the seller starts. Approving the delivered work transfers this amount to the seller.</p><Button disabled={busy} onClick={pay} className="w-full">{busy ? "Opening checkout…" : `Pay ${amount}`}</Button><Button variant="outline" onClick={() => router.refresh()} className="w-full">Check payment status</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</section>;
}
export function PayoutSetup({ connected }: { connected: boolean }) {
  const [country, setCountry] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function onboard() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/payments/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country: country.toUpperCase() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      const url = new URL(data.url); if (url.protocol !== "https:" || !["connect.stripe.com", "stripe.com"].includes(url.hostname)) throw new Error("Unexpected onboarding destination.");
      window.location.assign(url.href);
    } catch (e) { setError(e instanceof Error ? e.message : "Onboarding could not start."); setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-border p-5" aria-label="Seller payouts"><h2 className="font-semibold">Connect seller payouts</h2><p className="text-sm text-muted-foreground">Stripe collects your business and bank details. Complete its requirements before customers can fund your tasks. Returning here alone does not mean your account is ready.</p>{!connected && <label className="block text-sm">Business country (two-letter code)<input aria-label="Business country" className="ml-3 w-20 rounded border bg-background p-2 uppercase" maxLength={2} value={country} onChange={e=>setCountry(e.target.value)} placeholder="US" /></label>}<Button disabled={busy || (!connected && country.length !== 2)} onClick={onboard}>{busy ? "Opening Stripe…" : connected ? "Continue payout setup" : "Set up payouts"}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</section>;
}

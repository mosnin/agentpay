import { NextResponse } from "next/server";
import { stripeClient } from "@/lib/payments/stripe";
import { processPaymentEvent } from "@/lib/payments/events";
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature required" }, { status: 400 });
  let event;
  try { event = stripeClient().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!); }
  catch { return NextResponse.json({ error: "Invalid webhook signature or configuration" }, { status: 400 }); }
  try { await processPaymentEvent(event); return NextResponse.json({ received: true }); }
  catch { return NextResponse.json({ error: "Payment reconciliation pending; retry event" }, { status: 500 }); }
}

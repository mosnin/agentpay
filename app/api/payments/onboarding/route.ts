import { NextResponse } from "next/server";
import { resolveApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { appOrigin, stripeClient } from "@/lib/payments/stripe";
export async function POST(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const stripe = stripeClient();
    let accountId = user.stripeAccountId;
    if (!accountId) {
      const { country } = await request.json();
      if (typeof country !== "string" || !/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Choose your business country." }, { status: 400 });
      const account = await stripe.v2.core.accounts.create({ contact_email: user.email, display_name: user.name ?? user.email,
        dashboard: "express", identity: { country }, defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
        configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
      }, { idempotencyKey: `bids-seller-${user.id}` });
      accountId = account.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId } });
    }
    const link = await stripe.v2.core.accountLinks.create({ account: accountId, use_case: { type: "account_onboarding", account_onboarding: { configurations: ["recipient"], refresh_url: `${appOrigin()}/seller?onboarding=refresh`, return_url: `${appOrigin()}/seller?onboarding=returned` } } });
    return NextResponse.json({ url: link.url });
  } catch { return NextResponse.json({ error: "Payout onboarding could not start. Check the platform's Stripe configuration or retry." }, { status: 503 }); }
}

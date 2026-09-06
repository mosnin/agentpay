import "server-only";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripeClient, stripeLive } from "./stripe";

export async function processPaymentEvent(event: Stripe.Event) {
  if (event.livemode !== stripeLive()) throw new Error("Webhook payment environment mismatch");
  if (await prisma.paymentEvent.findUnique({ where: { id: event.id } })) return;
  const stripe = stripeClient();
  let update: { paymentId: string; data: Prisma.PaymentUpdateInput; taskId: string; cancel?: boolean; dispute?: boolean } | undefined;
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const payment = await prisma.payment.findUnique({ where: { stripeSessionId: session.id } });
    // A webhook may arrive before checkout persistence. Return failure so Stripe retries.
    if (!payment && session.metadata?.paymentId) throw new Error("Checkout is not persisted yet");
    if (payment && session.payment_status === "paid" && !["refunded", "released"].includes(payment.status)) {
      if (session.amount_total !== payment.amountMinor || session.currency !== "usd" || session.client_reference_id !== payment.taskId || session.livemode !== payment.livemode) throw new Error("Checkout amount, currency or task mismatch");
      const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      if (!intentId) throw new Error("Missing PaymentIntent");
      const intent = await stripe.paymentIntents.retrieve(intentId);
      if (intent.status !== "succeeded" || intent.amount_received !== payment.amountMinor) throw new Error("Funding is not confirmed");
      const charge = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id;
      if (!charge) throw new Error("Missing charge");
      update = { paymentId: payment.id, taskId: payment.taskId, data: { status: "escrowed", stripePaymentIntentId: intent.id, stripeChargeId: charge, lastError: null } };
    }
  } else if (event.type === "refund.updated" || event.type === "refund.created") {
    const refund = event.data.object as Stripe.Refund;
    const payment = await prisma.payment.findFirst({ where: { stripeRefundId: refund.id } });
    if (!payment && refund.metadata?.taskId) throw new Error("Refund is not persisted yet");
    if (payment && refund.status === "succeeded" && refund.amount === payment.amountMinor) update = { paymentId: payment.id, taskId: payment.taskId, cancel: true, data: { status: "refunded", operation: null, lastError: null } };
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const payment = await prisma.payment.findFirst({ where: { stripeChargeId: charge.id } });
    if (payment && charge.refunded && charge.amount_refunded === payment.amountMinor) {
      update = payment.status === "released"
        ? { paymentId: payment.id, taskId: payment.taskId, dispute: true, data: { operation: "dispute", lastError: "The source charge was refunded after seller transfer. Reconcile the seller transfer in Stripe." } }
        : { paymentId: payment.id, taskId: payment.taskId, cancel: true, data: { status: "refunded", operation: null, lastError: null } };
    }
  } else if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
    const payment = await prisma.payment.findFirst({ where: { stripeChargeId: chargeId } });
    if (payment) update = { paymentId: payment.id, taskId: payment.taskId, dispute: true, data: { operation: "dispute", lastError: "The buyer disputed this payment with the provider. Administrative review is required." } };
  }
  try {
    await prisma.$transaction(async tx => {
      await tx.paymentEvent.create({ data: { id: event.id, type: event.type } });
      if (update) {
        // Funding events cannot undo an already confirmed refund/transfer.
        if (update.data.status === "escrowed") await tx.payment.updateMany({ where: { id: update.paymentId, status: "pending" }, data: update.data as Prisma.PaymentUpdateManyMutationInput });
        else await tx.payment.update({ where: { id: update.paymentId }, data: update.data });
        if (update.cancel) await tx.task.updateMany({ where: { id: update.taskId, status: { not: "completed" } }, data: { status: "cancelled" } });
        if (update.dispute) await tx.task.update({ where: { id: update.taskId }, data: { status: "disputed" } });
      }
    });
  } catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error; }
}

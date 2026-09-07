import { readJob } from "./settlement/evm";
import { prisma } from "./prisma";
import * as x402 from "./payments/x402Adapter";
import { paymentMode, usdMinorUnits } from "./payment-mode";
import {
  appOrigin,
  sellerReady,
  stripeClient,
  stripeLive,
} from "./payments/stripe";
import type { PaymentMode, Payment } from "@prisma/client";

export async function createPaymentForTask(params: {
  taskId: string;
  amount: number;
  currency?: string;
  mode: PaymentMode;
  rail?: "stripe" | "crypto";
}) {
  const mode = params.rail ?? paymentMode();
  if (mode === "disabled") throw new Error("Payments are not configured.");
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: params.taskId },
    include: { sellerAgent: { include: { owner: true } } },
  });
  const sellerAccountId = task.sellerAgent?.owner.stripeAccountId;
  if (mode === "stripe") {
    stripeClient();
    if (!sellerAccountId || !(await sellerReady(sellerAccountId)))
      throw new Error(
        "This seller must finish payout onboarding before accepting paid tasks.",
      );
  }
  return prisma.payment.upsert({
    where: { taskId: params.taskId },
    update: {},
    create: {
      taskId: params.taskId,
      amount: params.amount,
      amountMinor: mode === "stripe" ? usdMinorUnits(params.amount) : null,
      currency: "USD",
      mode: mode === "stripe" ? "pay_per_task" : params.mode,
      status:
        mode === "demo" && params.mode === "mock_escrow"
          ? "escrowed"
          : "pending",
      provider:
        mode === "stripe"
          ? "stripe"
          : mode === "crypto"
            ? "stablecoin"
            : "x402_mock",
      sellerAccountId,
      livemode: mode === "stripe" && stripeLive(),
    },
  });
}

export async function ensureTaskFunded(taskId: string) {
  const payment = await prisma.payment.findUnique({ where: { taskId } });
  if (!payment || payment.status !== "escrowed" || payment.operation)
    throw new Error("Task funding must be confirmed before work can proceed.");
  if (
    payment.provider === "stripe" &&
    (!payment.stripeChargeId ||
      payment.livemode !== stripeLive() ||
      !["stripe", "crypto"].includes(paymentMode()))
  )
    throw new Error(
      "Task funding is not available in this payment environment.",
    );
  if (
    payment.provider !== "stripe" &&
    payment.provider !== "stablecoin" &&
    paymentMode() !== "demo"
  )
    throw new Error(
      "This is a legacy demo task. Create and fund a new task to commission real work.",
    );
  if (payment.provider === "stablecoin") {
    const order = await prisma.paymentOrder.findUnique({ where: { taskId } });
    if (!order?.fundedAt || !["funded", "submitted"].includes(order.state))
      throw new Error(
        "On-chain funding is not confirmed or settlement is under review.",
      );
    const { job } = await readJob(order.network, order.jobKey);
    if (
      ![1, 2].includes(job[7]) ||
      job[2] !== order.totalUnits ||
      job[8] !== order.termsHash ||
      String(job[0]).toLowerCase() !== order.buyerAddress.toLowerCase()
    )
      throw new Error(
        "The chain no longer shows available funding for this agreement. Reconcile its receipt before working.",
      );
  }
  return payment;
}

export async function checkoutForTask(taskId: string, buyerId: string) {
  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { payment: true },
  });
  if (task.buyerId !== buyerId)
    throw new Error("Only the buyer can fund this task.");
  const payment = task.payment;
  if (
    !payment ||
    payment.provider !== "stripe" ||
    task.status !== "pending" ||
    payment.status !== "pending" ||
    (payment.operation && payment.operation !== "checkout")
  )
    throw new Error("This task is not awaiting funding.");
  const stripe = stripeClient();
  if (payment.livemode !== stripeLive())
    throw new Error("Payment environment mismatch.");
  if (payment.stripeSessionId) {
    const session = await stripe.checkout.sessions.retrieve(
      payment.stripeSessionId,
    );
    if (session.status === "complete")
      throw new Error(
        "Payment is processing. Refresh the task after confirmation.",
      );
    if (session.status === "expired")
      throw new Error(
        "This checkout expired. Cancel this task and create a new agreement.",
      );
    return session.url;
  }
  if (!payment.sellerAccountId || !(await sellerReady(payment.sellerAccountId)))
    throw new Error("The seller's payout account needs attention.");
  await claimOperation(payment, "checkout");
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: taskId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: payment.amountMinor!,
            product_data: { name: task.title.slice(0, 120) },
          },
        },
      ],
      metadata: { taskId, paymentId: payment.id },
      payment_intent_data: {
        transfer_group: taskId,
        metadata: { taskId, paymentId: payment.id },
      },
      success_url: `${appOrigin()}/tasks/${taskId}?checkout=complete`,
      cancel_url: `${appOrigin()}/tasks/${taskId}?checkout=cancelled`,
    },
    { idempotencyKey: `bids-checkout-${payment.id}` },
  );
  await prisma.payment.update({
    where: { id: payment.id },
    data: { stripeSessionId: session.id, operation: null },
  });
  return session.url;
}

async function claimOperation(
  payment: Payment,
  operation: "checkout" | "transfer" | "refund",
) {
  if (
    payment.operation === operation &&
    payment.operationStartedAt &&
    Date.now() - payment.operationStartedAt.getTime() > 23 * 60 * 60 * 1000
  )
    throw new Error(
      "This uncertain provider operation needs administrative reconciliation before another attempt.",
    );
  const claimed = await prisma.payment.updateMany({
    where: {
      id: payment.id,
      status: { notIn: ["released", "refunded"] },
      OR: [{ operation: null }, { operation }],
    },
    data: {
      operation,
      operationStartedAt:
        payment.operation === operation
          ? (payment.operationStartedAt ?? new Date())
          : new Date(),
      lastError: null,
    },
  });
  if (!claimed.count)
    throw new Error(
      "Another payment operation is in progress. Refresh the task before trying again.",
    );
}

export async function releasePaymentForTask(taskId: string) {
  const payment = await prisma.payment.findUniqueOrThrow({ where: { taskId } });
  if (payment.status === "released") return payment;
  if (payment.status !== "escrowed")
    throw new Error("Funding is not confirmed.");
  if (payment.provider === "stablecoin")
    throw new Error(
      "Sign the wallet settlement action and reconcile its confirmed transaction before completing this task.",
    );
  if (payment.provider !== "stripe") {
    if (paymentMode() !== "demo")
      throw new Error(
        "Demo payments cannot be released in the real marketplace.",
      );
    const receipt = await x402.releasePayment({
      taskId,
      amount: payment.amount,
      currency: payment.currency,
    });
    return prisma.payment.update({
      where: { taskId },
      data: { status: "released", transactionHash: receipt.transactionHash },
    });
  }
  if (
    payment.livemode !== stripeLive() ||
    !payment.stripeChargeId ||
    !payment.sellerAccountId ||
    !payment.amountMinor
  )
    throw new Error("Confirmed funding details are incomplete.");
  await claimOperation(payment, "transfer");
  try {
    const charge = await stripeClient().charges.retrieve(
      payment.stripeChargeId,
    );
    if (
      !charge.paid ||
      charge.disputed ||
      charge.amount_refunded > 0 ||
      charge.amount !== payment.amountMinor ||
      charge.currency !== "usd"
    )
      throw new Error("The source payment requires review before settlement.");
    const transfer = await stripeClient().transfers.create(
      {
        amount: payment.amountMinor,
        currency: "usd",
        destination: payment.sellerAccountId,
        source_transaction: payment.stripeChargeId,
        transfer_group: taskId,
        metadata: { taskId },
      },
      { idempotencyKey: `bids-transfer-${payment.id}` },
    );
    return await prisma.payment.update({
      where: { taskId },
      data: {
        status: "released",
        stripeTransferId: transfer.id,
        transactionHash: transfer.id,
        operation: null,
        lastError: null,
      },
    });
  } catch (err) {
    await prisma.payment.update({
      where: { taskId },
      data: {
        lastError:
          "Transfer did not finish. Retry approval to reconcile the same provider operation.",
      },
    });
    throw err;
  }
}

export async function refundPaymentForTask(taskId: string) {
  const payment = await prisma.payment.findUnique({ where: { taskId } });
  if (!payment || payment.status === "refunded") return payment;
  if (payment.status === "released")
    throw new Error(
      "Delivery has already been settled. Open a dispute for review.",
    );
  if (payment.provider === "stablecoin")
    throw new Error(
      "Sign the wallet settlement action and reconcile its confirmed transaction before completing this task.",
    );
  if (payment.provider !== "stripe") {
    if (paymentMode() !== "demo")
      throw new Error("This legacy payment requires administrative review.");
    return prisma.payment.update({
      where: { taskId },
      data: { status: "refunded" },
    });
  }
  if (payment.livemode !== stripeLive())
    throw new Error("Payment environment mismatch.");
  await claimOperation(payment, "refund");
  const stripe = stripeClient();
  try {
    let intentId = payment.stripePaymentIntentId;
    if (!intentId && payment.stripeSessionId) {
      let session = await stripe.checkout.sessions.retrieve(
        payment.stripeSessionId,
      );
      if (session.status === "open") {
        try {
          session = await stripe.checkout.sessions.expire(session.id);
        } catch {
          session = await stripe.checkout.sessions.retrieve(session.id);
        }
      }
      if (session.status === "open")
        throw new Error("Checkout could not be closed. Retry cancellation.");
      intentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null);
    }
    if (intentId) {
      const intent = await stripe.paymentIntents.retrieve(intentId);
      if (intent.status === "processing")
        throw new Error(
          "Payment is processing. Retry cancellation after the provider confirms it.",
        );
      if (intent.status === "succeeded") {
        const refund = await stripe.refunds.create(
          { payment_intent: intentId, metadata: { taskId } },
          { idempotencyKey: `bids-refund-${payment.id}` },
        );
        await prisma.payment.update({
          where: { taskId },
          data: { stripeRefundId: refund.id, stripePaymentIntentId: intentId },
        });
        if (refund.status !== "succeeded")
          throw new Error(
            "The refund is pending with Stripe. Its signed update will confirm completion.",
          );
      } else if (intent.status !== "canceled") {
        await stripe.paymentIntents.cancel(
          intent.id,
          {},
          { idempotencyKey: `bids-cancel-${payment.id}` },
        );
      }
    }
    return await prisma.payment.update({
      where: { taskId },
      data: { status: "refunded", operation: null, lastError: null },
    });
  } catch (err) {
    await prisma.payment.update({
      where: { taskId },
      data: {
        lastError:
          "Cancellation is awaiting provider confirmation. Retry to reconcile; no new charge will be created.",
      },
    });
    throw err;
  }
}

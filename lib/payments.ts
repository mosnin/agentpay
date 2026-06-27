import { prisma } from "./prisma";
import * as x402 from "./payments/x402Adapter";
import type { PaymentMode } from "@prisma/client";

// ---------------------------------------------------------------------------
// Payment orchestration (mock, backed by the x402 adapter).
//
//   Task created    -> createPaymentForTask  (escrowed for mock_escrow)
//   Task completed  -> releasePaymentForTask (released + mock tx hash)
// ---------------------------------------------------------------------------

export async function createPaymentForTask(params: {
  taskId: string;
  amount: number;
  currency?: string;
  mode: PaymentMode;
}) {
  const currency = params.currency ?? "USD";
  const status = params.mode === "mock_escrow" ? "escrowed" : "pending";

  // x402: build the payment requirement (mock).
  const requirement = x402.createPaymentRequirement({
    taskId: params.taskId,
    amount: params.amount,
    currency,
    description: `Escrow for task ${params.taskId}`,
  });

  return prisma.payment.upsert({
    where: { taskId: params.taskId },
    create: {
      taskId: params.taskId,
      amount: params.amount,
      currency,
      status,
      mode: params.mode,
      provider: x402.isLive() ? "x402" : "x402_mock",
      transactionHash: status === "escrowed" ? requirement.nonce : null,
    },
    update: {
      amount: params.amount,
      currency,
      mode: params.mode,
      status,
    },
  });
}

export async function releasePaymentForTask(taskId: string) {
  const payment = await prisma.payment.findUnique({ where: { taskId } });
  if (!payment) return null;
  if (payment.status === "released") return payment;

  const receipt = await x402.releasePayment({
    taskId,
    amount: payment.amount,
    currency: payment.currency,
  });

  return prisma.payment.update({
    where: { taskId },
    data: {
      status: "released",
      transactionHash: receipt.transactionHash,
      provider: x402.isLive() ? "x402" : "x402_mock",
    },
  });
}

export async function refundPaymentForTask(taskId: string) {
  const payment = await prisma.payment.findUnique({ where: { taskId } });
  if (!payment) return null;
  return prisma.payment.update({
    where: { taskId },
    data: { status: "refunded" },
  });
}

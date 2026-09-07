import { BaseError } from "viem";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  createOrder,
  prepareOrderAction,
  reconcileOrder,
  serialize,
} from "@/lib/settlement/orders";
async function actor(id: string) {
  const a = await getAuthedUser();
  if (a.response) return a;
  const t = await prisma.task.findUnique({
    where: { id },
    include: { sellerAgent: true },
  });
  if (
    !t ||
    (![t.buyerId, t.sellerAgent?.ownerId].includes(a.user.id) &&
      a.user.role !== "admin")
  )
    return {
      user: null,
      response: NextResponse.json(
        { error: "Agreement not found." },
        { status: 404 },
      ),
    };
  return a;
}
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const a = await actor(id);
  if (a.response) return a.response;
  return NextResponse.json(
    serialize(
      await prisma.paymentOrder.findUnique({
        where: { taskId: id },
        include: {
          attempts: { orderBy: { createdAt: "desc" }, take: 20 },
          ledger: true,
        },
      }),
    ),
  );
}
export async function POST(
  r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const a = await actor(id);
  if (a.response) return a.response;
  const b = z
    .discriminatedUnion("action", [
      z.object({
        action: z.literal("resolve"),
        grossSellerUnits: z.string().regex(/^\d{1,40}$/),
      }),
      z.object({
        action: z.literal("quote"),
        network: z.string(),
        walletId: z.string(),
      }),
      z.object({
        action: z.literal("reconcile"),
        transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
      }),
      z.object({
        action: z.enum([
          "approve_allowance",
          "fund",
          "submit",
          "approve",
          "dispute",
          "refundExpired",
          "refundUnresolved",
          "sellerRefund",
          "claimAfterReview",
        ]),
      }),
    ])
    .safeParse(await r.json().catch(() => null));
  if (!b.success)
    return NextResponse.json(
      { error: "Invalid settlement action." },
      { status: 400 },
    );
  try {
    const d = b.data;
    const result =
      d.action === "quote"
        ? await createOrder(id, a.user!.id, d.network, d.walletId)
        : d.action === "reconcile"
          ? await reconcileOrder(id, d.transactionHash)
          : await prepareOrderAction(
              id,
              a.user!,
              d.action,
              d.action === "resolve" ? d.grossSellerUnits : undefined,
            );
    return NextResponse.json(serialize(result));
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof BaseError
            ? "The network request failed or the contract declined this action. Check its role, state and deadline, then retry."
            : e instanceof Error
              ? e.message
              : "Settlement needs attention.",
      },
      { status: 409 },
    );
  }
}

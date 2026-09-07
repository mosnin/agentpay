import { NextResponse } from "next/server";
import { z } from "zod";
import { BaseError } from "viem";
import { getAuthedUser, getRateLimitKey } from "@/lib/api-auth";
import { strictRateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import {
  quoteInstant,
  instantRequirements,
  settleInstant,
  confirmInstant,
} from "@/lib/payments/x402-live";
const base64 = (v: unknown) =>
  Buffer.from(JSON.stringify(v)).toString("base64");
export async function POST(r: Request) {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  if (!(await strictRateLimit(getRateLimitKey(r))).ok)
    return NextResponse.json({ error: "Try again later." }, { status: 429 });
  const key = r.headers.get("idempotency-key");
  if (!key || !/^[a-zA-Z0-9_-]{8,100}$/.test(key))
    return NextResponse.json(
      {
        error:
          "Use a stable Idempotency-Key of 8–100 letters, numbers, hyphens or underscores.",
      },
      { status: 400 },
    );
  const text = await r.text();
  if (text.length > 256000)
    return NextResponse.json(
      { error: "Request exceeds 256 KB." },
      { status: 413 },
    );
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = z
    .object({ records: z.array(z.record(z.unknown())).min(1).max(1000) })
    .safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Supply 1–1,000 record objects." },
      { status: 400 },
    );
  try {
    let row = await quoteInstant(a.user.id, key, parsed.data.records);
    const signature = r.headers.get("payment-signature");
    if (row.state === "broadcasting") row = await confirmInstant(row);
    if (row.state !== "settled" && !signature) {
      const requirement = instantRequirements(row);
      return NextResponse.json(requirement, {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": base64(requirement),
          "Cache-Control": "no-store",
        },
      });
    }
    if (row.state !== "settled") row = await settleInstant(row, signature!);
    return NextResponse.json(
      {
        requestId: row.id,
        result: row.output,
        receipt: {
          network: row.network,
          transactionHash: row.transactionHash,
          amountUnits: row.amountUnits.toString(),
          feeUnits: (
            (row.amountUnits * BigInt(row.feeBps)) /
            10000n
          ).toString(),
          treasury: row.treasury,
        },
      },
      {
        headers: {
          "PAYMENT-RESPONSE": base64({
            success: true,
            transaction: row.transactionHash,
            network: instantRequirements(row).accepts[0].network,
            payer: row.payer,
          }),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof BaseError
            ? "The payment network needs attention. Retry the same request key to recover its receipt."
            : e instanceof Error
              ? e.message
              : "Payment needs attention.",
      },
      { status: 409 },
    );
  }
}
export async function GET(r: Request) {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  const id = new URL(r.url).searchParams.get("requestId") || "";
  let row = await prisma.paidRequest.findFirst({
    where: { id, userId: a.user.id },
  });
  if (!row)
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (row.state === "broadcasting") {
    try {
      row = await confirmInstant(row);
    } catch {
      /* Keep the persisted pending state until receipt verification passes. */
    }
  }
  return NextResponse.json(
    {
      id: row.id,
      state: row.state,
      transactionHash: row.transactionHash,
      result: row.state === "settled" ? row.output : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

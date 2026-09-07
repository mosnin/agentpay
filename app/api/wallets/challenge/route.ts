import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser, getRateLimitKey } from "@/lib/api-auth";
import { strictRateLimit } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { canonicalAddress } from "@/lib/wallets/proof";
export async function POST(r: Request) {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  if (!(await strictRateLimit(getRateLimitKey(r))).ok)
    return NextResponse.json({ error: "Try again later." }, { status: 429 });
  const b = z
    .object({ family: z.enum(["evm", "solana"]), address: z.string().max(100) })
    .safeParse(await r.json().catch(() => null));
  if (!b.success)
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  try {
    const address = canonicalAddress(b.data.family, b.data.address);
    const expiresAt = new Date(Date.now() + 5 * 60000);
    const origin = new URL(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    ).origin;
    const message = `Bids wallet ownership proof
Origin: ${origin}
Account: ${a.user.id}
Wallet: ${b.data.family}:${address}
Nonce: ${randomBytes(32).toString("hex")}
Expires: ${expiresAt.toISOString()}
This links a wallet to Bids. It does not authorize payments or grant signing permissions.`;
    const challenge = await prisma.walletChallenge.create({
      data: {
        userId: a.user.id,
        family: b.data.family,
        address,
        message,
        expiresAt,
      },
    });
    return NextResponse.json({ id: challenge.id, message, expiresAt });
  } catch {
    return NextResponse.json(
      { error: "Invalid wallet address." },
      { status: 400 },
    );
  }
}

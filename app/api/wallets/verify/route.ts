import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { verifyWalletProof } from "@/lib/wallets/proof";
export async function POST(r: Request) {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  const b = z
    .object({
      challengeId: z.string(),
      signature: z.string().max(1000),
      label: z.string().trim().max(60).optional(),
    })
    .safeParse(await r.json().catch(() => null));
  if (!b.success)
    return NextResponse.json({ error: "Invalid proof." }, { status: 400 });
  const c = await prisma.walletChallenge.findFirst({
    where: {
      id: b.data.challengeId,
      userId: a.user.id,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (
    !c ||
    !(await verifyWalletProof(c.family, c.address, c.message, b.data.signature))
  )
    return NextResponse.json(
      { error: "Signature is invalid or the challenge expired." },
      { status: 400 },
    );
  try {
    const wallet = await prisma.$transaction(async (tx) => {
      const used = await tx.walletChallenge.updateMany({
        where: { id: c.id, consumedAt: null, expiresAt: { gt: new Date() } },
        data: { consumedAt: new Date() },
      });
      if (!used.count) throw Error("Proof already used.");
      const existing = await tx.walletAccount.findUnique({
        where: { family_address: { family: c.family, address: c.address } },
      });
      if (existing && existing.userId !== a.user.id)
        throw Error("Wallet is already linked to another account.");
      return tx.walletAccount.upsert({
        where: { family_address: { family: c.family, address: c.address } },
        create: {
          userId: a.user.id,
          family: c.family,
          address: c.address,
          label: b.data.label ?? "My wallet",
          verifiedAt: new Date(),
        },
        update: {
          revokedAt: null,
          verifiedAt: new Date(),
          label: b.data.label,
        },
      });
    });
    return NextResponse.json({
      id: wallet.id,
      address: wallet.address,
      family: wallet.family,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Wallet already linked or proof already consumed. Request a new challenge.",
      },
      { status: 409 },
    );
  }
}

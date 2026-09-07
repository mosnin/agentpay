import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  return NextResponse.json(
    await prisma.walletAccount.findMany({
      where: { userId: a.user.id, revokedAt: null },
      select: {
        id: true,
        family: true,
        address: true,
        label: true,
        provider: true,
        isPayout: true,
        verifiedAt: true,
      },
    }),
  );
}
export async function PATCH(r: Request) {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  const b = await r.json().catch(() => null);
  if (typeof b?.id !== "string" || !["payout", "revoke"].includes(b?.action))
    return NextResponse.json(
      { error: "Invalid wallet action." },
      { status: 400 },
    );
  const wallet = await prisma.walletAccount.findFirst({
    where: { id: b.id, userId: a.user.id, revokedAt: null },
  });
  if (!wallet)
    return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  await prisma.$transaction(
    async (tx) => {
      if (b.action === "payout")
        await tx.walletAccount.updateMany({
          where: { userId: a.user.id, family: wallet.family },
          data: { isPayout: false },
        });
      await tx.walletAccount.update({
        where: { id: wallet.id },
        data:
          b.action === "payout"
            ? { isPayout: true }
            : { revokedAt: new Date(), isPayout: false },
      });
      if (b.action === "revoke")
        await tx.spendingPolicy.updateMany({
          where: { walletId: wallet.id, revokedAt: null },
          data: { revokedAt: new Date(), state: "revoked" },
        });
    },
    { isolationLevel: "Serializable" },
  );
  return NextResponse.json({ ok: true });
}

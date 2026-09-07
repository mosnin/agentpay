import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { settlementNetworks } from "@/lib/settlement/networks";
import { chainClient, erc20Abi } from "@/lib/settlement/evm";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const a = await getAuthedUser();
  if (a.response) return a.response;
  const { id } = await params;
  const wallet = await prisma.walletAccount.findFirst({
    where: { id, userId: a.user.id, revokedAt: null },
  });
  if (!wallet)
    return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  if (wallet.family !== "evm")
    return NextResponse.json({
      balances: [],
      message:
        "Solana wallet ownership is connected. Solana settlement is not enabled in this release.",
    });
  try {
    const balances = await Promise.all(
      settlementNetworks()
        .filter((n) => n.enabled)
        .map(async (n) => {
          try {
            const client = chainClient(n);
            if ((await client.getChainId()) !== n.chainId) throw Error("chain");
            const available = await client.readContract({
              address: n.token,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [wallet.address as `0x${string}`],
            });
            const locked = await prisma.paymentOrder.aggregate({
              where: {
                network: n.id,
                buyerAddress: wallet.address,
                state: { in: ["funded", "submitted", "disputed"] },
              },
              _sum: { totalUnits: true },
            });
            return {
              network: n.id,
              symbol: n.symbol,
              decimals: n.decimals,
              live: n.live,
              available: available.toString(),
              locked: (locked._sum.totalUnits ?? 0n).toString(),
              status: "available",
            };
          } catch {
            return {
              network: n.id,
              symbol: n.symbol,
              decimals: n.decimals,
              live: n.live,
              status: "unavailable",
              available: null,
              locked: null,
            };
          }
        }),
    );
    return NextResponse.json(
      { balances },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Balance configuration needs attention." },
      { status: 503 },
    );
  }
}

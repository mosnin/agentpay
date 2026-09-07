import { formatUnits } from "viem";
import { getStablecoinEarnings } from "@/lib/settlement/earnings";
export async function SettledEarnings({ userId }: { userId: string }) {
  const balances = await getStablecoinEarnings(userId);
  if (!balances.length) return null;
  return <section aria-label="Stablecoin earnings" className="border-y py-6">
    <h2 className="text-xl font-semibold">Stablecoin received</h2>
    <p className="mt-2 text-sm text-muted-foreground">Confirmed seller credits after platform fees, shown in each token. Test payments are excluded.</p>
    <dl className="mt-4 divide-y">{balances.map(b => <div key={`${b.network}:${b.token}`} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><dt>{b.symbol} · {b.network}</dt><dd className="break-all font-medium tabular-nums">{formatUnits(BigInt(b.units), b.decimals)} {b.symbol}</dd></div>)}</dl>
  </section>;
}

"use client";
import { useState } from "react";
import { formatUnits } from "viem";
import { Button } from "@/components/ui/button";
type Balance = {
  network: string;
  symbol: string;
  decimals: number;
  live: boolean;
  available: string | null;
  locked: string | null;
  status: string;
};
export function WalletBalances({ id }: { id: string }) {
  const [balances, setBalances] = useState<Balance[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="space-y-3">
      <Button
        variant="outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch(`/api/wallets/${id}/balances`);
            const d = await r.json();
            if (!r.ok) throw Error(d.error);
            setBalances(d.balances);
            setMessage(
              d.message ||
                (!d.balances.length
                  ? "No settlement networks are connected yet."
                  : "Balances are read from the network. Locked amounts are confirmed Bids agreements and may await reconciliation."),
            );
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Reading network balances…" : "Check balances"}
      </Button>
      {balances?.map((b) => (
        <div key={b.network} className="space-y-1 border-t pt-3 text-sm">
          <p className="font-medium">
            {b.network} · {b.live ? "Live" : "Test network"}
          </p>
          {b.available === null ? (
            <p>Balance temporarily unavailable</p>
          ) : (
            <p>
              Available {formatUnits(BigInt(b.available), b.decimals)}{" "}
              {b.symbol} · Locked in Bids{" "}
              {formatUnits(BigInt(b.locked || "0"), b.decimals)} {b.symbol}
            </p>
          )}
        </div>
      ))}
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </section>
  );
}

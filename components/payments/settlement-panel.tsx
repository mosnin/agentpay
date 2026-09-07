"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useBidsWalletProvider } from "@/components/wallets/wallet-runtime";
import { formatUnits, parseUnits } from "viem";
type Order = {
  network: string;
  state: string;
  symbol: string;
  decimals: number;
  totalUnits: string;
  feeUnits: string;
  sellerUnits: string;
  feeBps: number;
  treasury: string;
  sellerAddress: string;
  buyerAddress: string;
  escrow: string;
  arbiter: string;
  deliverBy: string;
  reviewSeconds: number;
  disputeSeconds: number;
  livemode: boolean;
  attempts?: { transactionHash: string; kind: string }[];
};
type Network = { id: string; symbol: string; live: boolean };
type Wallet = { id: string; address: string; family: string };
export function SettlementPanel({
  taskId,
  buyer,
  seller,
  arbiter = false,
  status,
}: {
  taskId: string;
  buyer: boolean;
  seller: boolean;
  arbiter?: boolean;
  status: string;
}) {
  const [gross, setGross] = useState("0");
  const [order, setOrder] = useState<Order | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [network, setNetwork] = useState("");
  const [wallet, setWallet] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingHash, setPendingHash] = useState("");
  const [allowanceDone, setAllowanceDone] = useState(false);
  const providerFor = useBidsWalletProvider();
  const router = useRouter();
  const url = `/api/tasks/${taskId}/settlement`;
  async function load() {
    const r = await fetch(url);
    if (!r.ok) throw Error("Could not load this agreement’s payment terms.");
    setOrder(await r.json());
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(url).then((r) => {
        if (!r.ok) throw Error("Payment terms unavailable.");
        return r.json();
      }),
      fetch("/api/payments/networks").then((r) => r.json()),
      fetch("/api/wallets").then((r) => r.json()),
    ])
      .then(([o, n, w]) => {
        if (!active) return;
        setOrder(o);
        setNetworks(n.available || []);
        setNetwork(n.available?.[0]?.id || "");
        const evm = Array.isArray(w)
          ? w.filter((v: Wallet) => v.family === "evm")
          : [];
        setWallets(evm);
        setWallet(evm[0]?.id || "");
        setPendingHash(localStorage.getItem(`bids:${taskId}:settlement`) || "");
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [taskId, url]);
  async function post(body: unknown) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    return d;
  }
  async function reconcile(hash = pendingHash) {
    setBusy(true);
    setError("");
    try {
      await post({ action: "reconcile", transactionHash: hash });
      localStorage.removeItem(`bids:${taskId}:settlement`);
      setPendingHash("");
      await load();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function act(action: string) {
    setBusy(true);
    setError("");
    try {
      if (action === "quote") {
        setOrder(await post({ action, network, walletId: wallet }));
        return;
      }
      const tx = await post(
        action === "resolve"
          ? {
              action,
              grossSellerUnits: parseUnits(gross, order!.decimals).toString(),
            }
          : { action },
      );
      const provider = await providerFor(tx.from);
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts[0]?.toLowerCase() !== tx.from.toLowerCase())
        throw Error(`Switch to the agreement wallet ${tx.from}.`);
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${Number(tx.chainId).toString(16)}` }],
      });
      const hash = (await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: tx.from, to: tx.to, data: tx.data, value: tx.value }],
      })) as string;
      if (action === "approve_allowance") {
        setAllowanceDone(true);
        setError(
          "Token approval submitted. Wait for wallet confirmation before funding. If funding is unavailable, check the allowance transaction in your wallet.",
        );
      } else {
        localStorage.setItem(`bids:${taskId}:settlement`, hash);
        setPendingHash(hash);
        setError(
          "Transaction submitted. Check confirmation to update the agreement.",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  let allocation: bigint | null = null;
  try {
    if (
      order &&
      /^\d+(\.\d+)?$/.test(gross) &&
      (gross.split(".")[1]?.length || 0) <= order.decimals
    ) {
      const units = parseUnits(gross, order.decimals);
      if (units <= BigInt(order.totalUnits)) allocation = units;
    }
  } catch {}
  const money = (units: string) =>
    `${formatUnits(BigInt(units), order!.decimals)} ${order!.symbol}`;
  return (
    <section
      className="mb-6 min-w-0 space-y-4 rounded-xl border p-4"
      aria-label="Stablecoin settlement"
    >
      <h2 className="text-lg font-semibold">Agreement payment</h2>
      {order ? (
        <>
          <p className="text-sm font-medium">
            {order.network} · {order.livemode ? "Live funds" : "Test network"} ·{" "}
            {order.state}
          </p>
          <dl className="space-y-2 text-sm">
            {[
              ["Buyer pays", money(order.totalUnits)],
              [
                `Platform fee (${order.feeBps / 100}%, deducted from seller)`,
                money(order.feeUnits),
              ],
              ["Seller receives", money(order.sellerUnits)],
              ["Delivery deadline", new Date(order.deliverBy).toLocaleString()],
              [
                "Buyer review window",
                `${order.reviewSeconds / 86400} days after on-chain submission`,
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <details className="text-sm">
            <summary className="cursor-pointer py-2">
              Addresses and refund terms
            </summary>
            <div className="space-y-3 pt-2">
              {[
                ["Escrow", order.escrow],
                ["Seller", order.sellerAddress],
                ["Treasury", order.treasury],
                ["Dispute authority", order.arbiter],
              ].map(([k, v]) => (
                <p key={k}>
                  {k}
                  <span className="mt-1 block break-all font-mono text-xs">
                    {v}
                  </span>
                </p>
              ))}
              <p className="leading-relaxed text-muted-foreground">
                After submission, the seller can claim payment when the review
                window ends. Dispute on-chain before that deadline to pause
                release. The dispute authority has{" "}
                {order.disputeSeconds / 86400} days to decide, after which the
                buyer can claim a refund. Without submission, the buyer can
                refund after the delivery deadline. The seller can voluntarily
                refund before a dispute. Network fees are separate and are not
                refunded.
              </p>
            </div>
          </details>
          <div className="flex flex-col gap-2">
            {buyer && order.state === "quoted" && (
              <>
                <Button
                  variant="outline"
                  disabled={busy || !!pendingHash}
                  onClick={() => act("approve_allowance")}
                >
                  {allowanceDone
                    ? "Check / retry token allowance"
                    : "1. Approve exact token allowance"}
                </Button>
                <Button
                  disabled={busy || !!pendingHash}
                  onClick={() => act("fund")}
                >
                  2. Fund {money(order.totalUnits)}
                </Button>
              </>
            )}
            {seller && order.state === "funded" && status === "validating" && (
              <Button
                disabled={busy || !!pendingHash}
                onClick={() => act("submit")}
              >
                Commit delivered artifact on-chain
              </Button>
            )}
            {buyer &&
              order.state === "submitted" &&
              status === "validating" && (
                <Button
                  disabled={busy || !!pendingHash}
                  onClick={() => act("approve")}
                >
                  Approve delivery and release {money(order.totalUnits)}
                </Button>
              )}
            {["funded", "submitted"].includes(order.state) && seller && (
              <Button
                variant="outline"
                disabled={busy || !!pendingHash}
                onClick={() => act("sellerRefund")}
              >
                Refund buyer in full
              </Button>
            )}
            {order.state === "submitted" && (
              <Button
                variant="outline"
                disabled={busy || !!pendingHash}
                onClick={() => act("dispute")}
              >
                Dispute and pause release
              </Button>
            )}
            {order.state === "submitted" && seller && (
              <Button
                variant="outline"
                disabled={busy || !!pendingHash}
                onClick={() => act("claimAfterReview")}
              >
                Claim after review window
              </Button>
            )}
            {order.state === "funded" && buyer && (
              <Button
                variant="outline"
                disabled={busy || !!pendingHash}
                onClick={() => act("refundExpired")}
              >
                Refund after delivery deadline
              </Button>
            )}
            {order.state === "disputed" && buyer && (
              <Button
                variant="outline"
                disabled={busy || !!pendingHash}
                onClick={() => act("refundUnresolved")}
              >
                Refund after arbitration deadline
              </Button>
            )}
          </div>
          {arbiter && order.state === "disputed" && (
            <section className="space-y-3 border-t pt-4">
              <h3 className="font-medium">Dispute allocation</h3>
              <p className="text-sm text-muted-foreground">
                Only the agreement’s dispute wallet can sign this decision. The
                remainder returns to the buyer.
              </p>
              <label className="block text-sm">
                Seller allocation before platform fee ({order.symbol})
                <input
                  inputMode="decimal"
                  value={gross}
                  onChange={(e) => setGross(e.target.value)}
                  className="mt-2 min-h-11 w-full rounded border bg-background px-2"
                />
              </label>
              {allocation !== null ? (
                <p className="text-sm">
                  Seller receives{" "}
                  {money(
                    (
                      allocation -
                      (allocation * BigInt(order.feeBps)) / 10000n
                    ).toString(),
                  )}
                  ; platform receives{" "}
                  {money(
                    ((allocation * BigInt(order.feeBps)) / 10000n).toString(),
                  )}
                  ; buyer refund{" "}
                  {money((BigInt(order.totalUnits) - allocation).toString())}.
                </p>
              ) : (
                <p role="alert" className="text-sm">
                  Enter an allocation between zero and the funded amount.
                </p>
              )}
              <Button
                disabled={busy || !!pendingHash || allocation === null}
                onClick={() => act("resolve")}
              >
                Sign dispute settlement
              </Button>
            </section>
          )}
          {order.attempts?.map((a) => (
            <p
              key={a.transactionHash}
              className="break-all text-xs text-muted-foreground"
            >
              Confirmed {a.kind}: {a.transactionHash}
            </p>
          ))}
        </>
      ) : buyer ? (
        <div className="space-y-3">
          {!networks.length ? (
            <p className="text-sm text-muted-foreground">
              No settlement network is connected yet. Funding opens once its
              deployed contract and treasury configuration are verified.
            </p>
          ) : (
            <>
              <label className="block text-sm">
                Payment network
                <select
                  className="mt-1 block min-h-11 w-full rounded border bg-background p-2"
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                >
                  {networks.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} · {n.symbol}
                      {n.live ? "" : " · test"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Your payment wallet
                <select
                  className="mt-1 block min-h-11 w-full rounded border bg-background p-2"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.address.slice(0, 8)}…{w.address.slice(-6)}
                    </option>
                  ))}
                </select>
              </label>
              <Button disabled={busy || !wallet} onClick={() => act("quote")}>
                Review fixed payment terms
              </Button>
            </>
          )}
          <Link
            className="inline-flex min-h-11 items-center text-sm underline"
            href="/wallets"
          >
            Manage wallets
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Waiting for the buyer to confirm payment terms and fund the agreement.
        </p>
      )}
      {pendingHash && (
        <div className="space-y-2">
          <p className="break-all text-xs">Pending: {pendingHash}</p>
          <Button disabled={busy} variant="outline" onClick={() => reconcile()}>
            Check transaction confirmation
          </Button>
        </div>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer py-2">Recover a transaction</summary>
        <label className="block">
          Escrow transaction hash
          <input
            value={pendingHash}
            onChange={(e) => setPendingHash(e.target.value)}
            className="mt-2 min-h-11 w-full rounded border bg-background px-2"
            placeholder="0x…"
          />
        </label>
        <Button
          className="mt-2"
          variant="outline"
          disabled={busy || !/^0x[0-9a-fA-F]{64}$/.test(pendingHash)}
          onClick={() => reconcile()}
        >
          Reconcile receipt
        </Button>
      </details>
      {error && (
        <p role="status" className="break-words text-sm">
          {error}
        </p>
      )}
    </section>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import bs58 from "bs58";
type EvmProvider = {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
};
type SolProvider = {
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage: (
    message: Uint8Array,
    encoding?: string,
  ) => Promise<{ signature: Uint8Array }>;
};
export function evmProvider() {
  return (window as unknown as { ethereum?: EvmProvider }).ethereum;
}
export async function linkWallet(
  family: string,
  address: string,
  sign: (message: string) => Promise<string>,
) {
  const headers = { "Content-Type": "application/json" };
  const c = await fetch("/api/wallets/challenge", {
    method: "POST",
    headers,
    body: JSON.stringify({ family, address }),
  });
  const challenge = await c.json();
  if (!c.ok) throw Error(challenge.error);
  const signature = await sign(challenge.message);
  const v = await fetch("/api/wallets/verify", {
    method: "POST",
    headers,
    body: JSON.stringify({ challengeId: challenge.id, signature }),
  });
  const result = await v.json();
  if (!v.ok) throw Error(result.error);
  return result;
}
export function ConnectWallet() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function connect(family: "evm" | "solana") {
    setBusy(true);
    setError("");
    try {
      if (family === "evm") {
        const provider = evmProvider();
        if (!provider)
          throw Error(
            "Open this page in your wallet browser, or install an Ethereum-compatible wallet.",
          );
        const accounts = (await provider.request({
          method: "eth_requestAccounts",
        })) as string[];
        await linkWallet(
          family,
          accounts[0],
          async (message) =>
            (await provider.request({
              method: "personal_sign",
              params: [
                `0x${Array.from(new TextEncoder().encode(message), (b) => b.toString(16).padStart(2, "0")).join("")}`,
                accounts[0],
              ],
            })) as string,
        );
      } else {
        const provider = (window as unknown as { solana?: SolProvider }).solana;
        if (!provider)
          throw Error(
            "Open this page in a Solana wallet browser or install a compatible wallet.",
          );
        const { publicKey } = await provider.connect();
        await linkWallet(family, publicKey.toString(), async (message) =>
          bs58.encode(
            (
              await provider.signMessage(
                new TextEncoder().encode(message),
                "utf8",
              )
            ).signature,
          ),
        );
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={() => connect("evm")}>
          Connect Ethereum / Base wallet
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => connect("solana")}
        >
          Connect Solana wallet
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        You sign an ownership message. Connecting does not grant Bids permission
        to move funds.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
export function WalletActions({
  id,
  isPayout,
}: {
  id: string;
  isPayout: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function act(action: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/wallets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!isPayout && (
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => act("payout")}
          >
            Use for future seller payouts
          </Button>
        )}
        <Button disabled={busy} variant="ghost" onClick={() => act("revoke")}>
          Disconnect from Bids
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

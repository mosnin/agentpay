"use client";
import { useCreateWallet, useWallets } from "@privy-io/react-auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { linkWallet } from "./wallet-client";
function Embedded() {
  const { createWallet } = useCreateWallet();
  const { wallets } = useWallets();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <div className="space-y-3">
      <Button
        disabled={busy}
        variant="outline"
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const wallet = wallets.find((w) => w.walletClientType === "privy");
            if (!wallet) {
              await createWallet();
              setError(
                "Wallet created. Select this button again to link its ownership to Bids.",
              );
              return;
            }
            const provider = await wallet.getEthereumProvider();
            await linkWallet(
              "evm",
              wallet.address,
              async (message) =>
                (await provider.request({
                  method: "personal_sign",
                  params: [
                    `0x${Array.from(new TextEncoder().encode(message), (b) => b.toString(16).padStart(2, "0")).join("")}`,
                    wallet.address,
                  ],
                })) as string,
            );
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {wallets.some((w) => w.walletClientType === "privy")
          ? "Link my embedded wallet"
          : "Create my embedded wallet"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Your signed-in identity controls this wallet. No server signer is
        attached. Keep access to your account recovery methods.
      </p>
      {error && (
        <p role="status" className="text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
export function EmbeddedWallet() {
  return <Embedded />;
}

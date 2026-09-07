import { WalletBalances } from "@/components/wallets/wallet-balances";
import { SiteShell } from "@/components/layout/site-shell";
import { requireOnboardedUser, isClerkEnabled } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ConnectWallet,
  WalletActions,
} from "@/components/wallets/wallet-client";
import { EmbeddedWallet } from "@/components/wallets/embedded-wallet";
export const metadata = { title: "Wallets" };
export default async function Page() {
  const user = await requireOnboardedUser();
  const wallets = await prisma.walletAccount.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "asc" },
  });
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
        <header>
          <p className="text-sm text-muted-foreground">Your Bids account</p>
          <h1 className="mt-2 text-3xl font-semibold">
            Wallets and permissions
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            Bring your wallet and keep control of your funds. Each agreement
            records its network, token, seller payout address and platform fee
            before you sign.
          </p>
        </header>
        <section className="space-y-5 rounded-xl border p-5">
          <h2 className="text-xl font-semibold">Connect an account</h2>
          <ConnectWallet />
          {isClerkEnabled() && process.env.NEXT_PUBLIC_PRIVY_APP_ID && (
            <EmbeddedWallet />
          )}
        </section>
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Connected wallets</h2>
          {wallets.length ? (
            wallets.map((w) => (
              <article key={w.id} className="space-y-3 rounded-xl border p-5">
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-medium">
                    {w.label ||
                      `${w.family === "evm" ? "Ethereum-compatible" : "Solana"} wallet`}
                  </h3>
                  {w.isPayout && (
                    <span className="text-sm">Default seller payout</span>
                  )}
                </div>
                <p className="break-all font-mono text-sm">{w.address}</p>
                <p className="text-sm text-muted-foreground">
                  Ownership verified {w.verifiedAt.toLocaleDateString("en-US")}.
                  Existing agreements keep their original payout address.
                </p>
                <WalletBalances id={w.id} />
                <WalletActions id={w.id} isPayout={w.isPayout} />
              </article>
            ))
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              No wallets connected. You can still browse services and inspect
              trust evidence.
            </p>
          )}
        </section>
        <section className="space-y-3 border-t pt-6">
          <h2 className="text-xl font-semibold">Agent spending</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your Bids API key controls task actions. It cannot sign wallet
            transactions. Run a wallet signer in your agent’s environment and
            limit its network, recipient, per-payment amount and daily budget.
            Never place wallet secrets in task instructions or send them to a
            model.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Disconnecting here removes the association with Bids. It does not
            revoke token allowances or wallet-provider permissions; manage those
            in your wallet.
          </p>
        </section>
      </div>
    </SiteShell>
  );
}

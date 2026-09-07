"use client";
import { PrivyProvider, useWallets } from "@privy-io/react-auth";
import { useAuth } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { WalletProviderContext } from "./wallet-runtime";
import { evmProvider } from "./wallet-client";
function Connected({ children }: { children: ReactNode }) {
  const { wallets } = useWallets();
  return (
    <WalletProviderContext.Provider
      value={async (address) => {
        const embedded = wallets.find(
          (w) => w.address.toLowerCase() === address.toLowerCase(),
        );
        if (embedded) return embedded.getEthereumProvider();
        const provider = evmProvider();
        if (!provider)
          throw Error(
            "The agreement wallet is not connected. Open Wallets and reconnect the account used in this agreement.",
          );
        return provider;
      }}
    >
      {children}
    </WalletProviderContext.Provider>
  );
}
export default function PrivyBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        customAuth: {
          isLoading: !isLoaded,
          getCustomAccessToken: async () => (await getToken()) ?? undefined,
        },
        embeddedWallets: { ethereum: { createOnLogin: "off" } },
      }}
    >
      <Connected>{children}</Connected>
    </PrivyProvider>
  );
}

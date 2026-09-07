"use client";
import { createContext, useContext, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useClerkEnabled } from "@/components/layout/clerk-enabled-context";
import { evmProvider } from "./wallet-client";
type Provider = NonNullable<ReturnType<typeof evmProvider>>;
export const WalletProviderContext = createContext<
  (address: string) => Promise<Provider>
>(async () => {
  const provider = evmProvider();
  if (!provider)
    throw Error(
      "Open this agreement in your wallet browser or connect an embedded wallet.",
    );
  return provider;
});
export function useBidsWalletProvider() {
  return useContext(WalletProviderContext);
}
const PrivyBridge = dynamic(() => import("./privy-bridge"), { ssr: false });
export function WalletRuntime({ children }: { children: ReactNode }) {
  const clerk = useClerkEnabled();
  if (!clerk || !process.env.NEXT_PUBLIC_PRIVY_APP_ID) return children;
  return <PrivyBridge>{children}</PrivyBridge>;
}

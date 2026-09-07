import { z } from "zod";
import { isAddress } from "viem";
const address = z
  .string()
  .refine(isAddress)
  .transform((v) => v as `0x${string}`);
const config = z.object({
  id: z.enum([
    "base",
    "base-sepolia",
    "ethereum",
    "sepolia",
    "robinhood",
    "local",
  ]),
  chainId: z.number().int().positive(),
  rpcUrl: z.string().url(),
  token: address,
  symbol: z.enum(["USDC", "USDG"]),
  decimals: z.number().int().min(6).max(18),
  escrow: address,
  treasury: address,
  arbiter: address,
  feeBps: z.number().int().min(0).max(1000),
  deploymentBlock: z.string().regex(/^\d+$/).default("0"),
  confirmations: z.number().int().min(1).max(100),
  codeHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  live: z.boolean(),
  enabled: z.boolean(),
  explorer: z.string().url().optional(),
});
export type SettlementNetwork = z.infer<typeof config>;
const ids: Record<string, number> = {
  base: 8453,
  "base-sepolia": 84532,
  ethereum: 1,
  sepolia: 11155111,
  robinhood: 4663,
  local: 31337,
};
// Issuer-native assets only on live rails. A configured label cannot turn an
// arbitrary token into USDC/USDG. Deployment review still verifies issuer lists.
const liveAssets: Record<string, { symbol: string; address: string }> = {
  base: {
    symbol: "USDC",
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  },
  ethereum: {
    symbol: "USDC",
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
  robinhood: {
    symbol: "USDG",
    address: "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
  },
};
export function settlementNetworks(): SettlementNetwork[] {
  const raw = process.env.BIDS_SETTLEMENT_NETWORKS;
  if (!raw) return [];
  let networks: SettlementNetwork[];
  try {
    networks = z.array(config).max(6).parse(JSON.parse(raw));
  } catch {
    throw Error("Settlement configuration needs attention.");
  }
  if (new Set(networks.map((n) => n.id)).size !== networks.length)
    throw Error("Duplicate settlement network.");
  for (const n of networks) {
    if (ids[n.id] !== n.chainId) throw Error("Settlement chain ID mismatch.");
    if (n.live !== ["base", "ethereum", "robinhood"].includes(n.id))
      throw Error("Settlement environment mismatch.");
    if (
      n.live &&
      (n.symbol !== liveAssets[n.id].symbol ||
        n.token.toLowerCase() !== liveAssets[n.id].address)
    )
      throw Error("Live settlement requires the issuer-native stablecoin.");
    if (n.live && n.deploymentBlock === "0")
      throw Error("Live settlement needs its deployment block.");
    if (n.live && (n.confirmations < 3 || !n.rpcUrl.startsWith("https://")))
      throw Error(
        "Live settlement requires HTTPS and at least three confirmations.",
      );
  }
  return networks;
}
export function getSettlementNetwork(id: string) {
  const n = settlementNetworks().find((n) => n.id === id && n.enabled);
  if (!n) throw Error("This settlement network is not configured.");
  return n;
}
export function publicNetworks() {
  return settlementNetworks()
    .filter((n) => n.enabled)
    .map(({ rpcUrl: _, codeHash: __, ...n }) => n);
}
export const NETWORK_ROADMAP = [
  { id: "base", name: "Base", family: "evm" },
  { id: "solana", name: "Solana", family: "solana" },
  { id: "ethereum", name: "Ethereum", family: "evm" },
  { id: "robinhood", name: "Robinhood Chain", family: "evm" },
];

import { afterEach, expect, it, vi } from "vitest";
import { settlementNetworks } from "@/lib/settlement/networks";
const base = {
  id: "base",
  chainId: 8453,
  rpcUrl: "https://rpc.example.invalid",
  token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  symbol: "USDC",
  decimals: 6,
  escrow: `0x${"1".repeat(40)}`,
  treasury: `0x${"2".repeat(40)}`,
  arbiter: `0x${"3".repeat(40)}`,
  feeBps: 500,
  deploymentBlock: "100",
  confirmations: 3,
  codeHash: `0x${"4".repeat(64)}`,
  live: true,
  enabled: true,
};
afterEach(() => vi.unstubAllEnvs());
it("accepts the issuer-native asset but rejects a fake USDC label on a live rail", () => {
  vi.stubEnv("BIDS_SETTLEMENT_NETWORKS", JSON.stringify([base]));
  expect(settlementNetworks()[0].token).toBe(base.token);
  vi.stubEnv(
    "BIDS_SETTLEMENT_NETWORKS",
    JSON.stringify([{ ...base, token: base.escrow }]),
  );
  expect(settlementNetworks).toThrow("issuer-native");
  vi.stubEnv(
    "BIDS_SETTLEMENT_NETWORKS",
    JSON.stringify([{ ...base, symbol: "USDG" }]),
  );
  expect(settlementNetworks).toThrow("issuer-native");
});
it("rejects wrong chain identity, insecure live transport and insufficient confirmation policy", () => {
  for (const patch of [
    { chainId: 1 },
    { live: false },
    { rpcUrl: "http://rpc.example.invalid" },
    { confirmations: 1 },
    { deploymentBlock: "0" },
  ]) {
    vi.stubEnv(
      "BIDS_SETTLEMENT_NETWORKS",
      JSON.stringify([{ ...base, ...patch }]),
    );
    expect(settlementNetworks).toThrow();
  }
});

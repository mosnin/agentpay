import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { canonicalAddress, verifyWalletProof } from "@/lib/wallets/proof";
import { BidsSplitClient } from "@/lib/payments/x402-client";
import { getSettlementNetwork } from "@/lib/settlement/networks";
const account = privateKeyToAccount(`0x${"1".repeat(64)}`);
const other = privateKeyToAccount(`0x${"2".repeat(64)}`);
describe("wallet ownership and financial policy boundaries", () => {
  it("verifies EVM ownership and rejects a signature for another account or message", async () => {
    const message = "Bids account A, nonce 1, expires today";
    const signature = await account.signMessage({ message });
    expect(
      await verifyWalletProof("evm", account.address, message, signature),
    ).toBe(true);
    expect(
      await verifyWalletProof("evm", other.address, message, signature),
    ).toBe(false);
    expect(
      await verifyWalletProof(
        "evm",
        account.address,
        message + "changed",
        signature,
      ),
    ).toBe(false);
  });
  it("verifies Solana proof and rejects tampering", async () => {
    const pair = nacl.sign.keyPair();
    const message = "Bids ownership proof";
    const signature = bs58.encode(
      nacl.sign.detached(new TextEncoder().encode(message), pair.secretKey),
    );
    expect(
      await verifyWalletProof(
        "solana",
        bs58.encode(pair.publicKey),
        message,
        signature,
      ),
    ).toBe(true);
    expect(
      await verifyWalletProof(
        "solana",
        bs58.encode(pair.publicKey),
        message + "changed",
        signature,
      ),
    ).toBe(false);
  });
  it("rejects unknown wallet families and malformed addresses", () => {
    expect(() => canonicalAddress("solana", "abc")).toThrow();
    expect(() => canonicalAddress("evm", "not-an-address")).toThrow();
    expect(() => canonicalAddress("other", account.address)).toThrow();
  });
  it("does not expose a network without explicit deployment configuration", () => {
    expect(() => getSettlementNetwork("unsupported")).toThrow();
  });
  it("rejects an oversized x402 request before invoking a signer or budget reservation", async () => {
    let signed = 0,
      reserved = 0;
    const scheme = new BidsSplitClient(
      {
        address: account.address,
        signTypedData: async () => {
          signed++;
          return "0x";
        },
      },
      {
        network: "eip155:8453",
        asset: account.address,
        router: other.address,
        sellers: [account.address],
        treasury: other.address,
        maxAmount: 100n,
        maxFeeBps: 500,
        reserve: async () => {
          reserved++;
        },
      },
    );
    await expect(
      scheme.createPaymentPayload(2, {
        scheme: "bids-split-v1",
        network: "eip155:8453",
        asset: account.address,
        amount: "101",
        payTo: other.address,
        maxTimeoutSeconds: 300,
        extra: {},
      }),
    ).rejects.toThrow("policy");
    expect(signed).toBe(0);
    expect(reserved).toBe(0);
  });
});

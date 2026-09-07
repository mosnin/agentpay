import type {
  PaymentRequirements,
  SchemeNetworkClient,
} from "@x402/core/types";
import { isAddress, type Hex } from "viem";
import {
  SPLIT_SCHEME,
  receiveTypes,
  splitAuthorization,
  type SplitTerms,
} from "./x402-protocol";
/** Explicit x402 extension; standard `exact` clients must register this scheme. */
export class BidsSplitClient implements SchemeNetworkClient {
  readonly scheme = SPLIT_SCHEME;
  constructor(
    private signer: {
      address: Hex;
      signTypedData: (args: unknown) => Promise<Hex>;
    },
    private policy: {
      network: string;
      asset: Hex;
      router: Hex;
      sellers: Hex[];
      treasury: Hex;
      maxAmount: bigint;
      maxFeeBps: number;
      reserve: (requestId: string, amount: bigint) => Promise<void>;
    },
  ) {}
  async createPaymentPayload(version: number, r: PaymentRequirements) {
    const e = r.extra as SplitTerms;
    const amount = BigInt(r.amount);
    if (
      version !== 2 ||
      r.scheme !== SPLIT_SCHEME ||
      r.network !== this.policy.network ||
      r.asset.toLowerCase() !== this.policy.asset.toLowerCase() ||
      r.payTo.toLowerCase() !== this.policy.router.toLowerCase() ||
      amount <= 0n ||
      amount > this.policy.maxAmount ||
      !e ||
      !isAddress(e.seller) ||
      !this.policy.sellers.some(
        (s) => s.toLowerCase() === e.seller.toLowerCase(),
      ) ||
      e.treasury.toLowerCase() !== this.policy.treasury.toLowerCase() ||
      !Number.isInteger(e.feeBps) ||
      e.feeBps < 0 ||
      e.feeBps > this.policy.maxFeeBps ||
      !/^0x[0-9a-f]{64}$/i.test(e.requestId) ||
      e.validBefore <= Date.now() / 1000 ||
      e.validBefore > Date.now() / 1000 + 600
    )
      throw Error("Payment exceeds the agent's explicit wallet policy.");
    await this.policy.reserve(e.requestId, amount);
    const authorization = splitAuthorization(
      this.signer.address,
      r.payTo as Hex,
      amount,
      e,
    );
    const signature = await this.signer.signTypedData({
      domain: {
        name: e.name,
        version: e.version,
        chainId: Number(r.network.split(":")[1]),
        verifyingContract: r.asset,
      },
      types: receiveTypes,
      primaryType: "ReceiveWithAuthorization",
      message: authorization,
    });
    return {
      x402Version: 2,
      payload: {
        payer: this.signer.address,
        signature,
        requestId: e.requestId,
      },
    };
  }
}

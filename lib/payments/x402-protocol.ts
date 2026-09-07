import {
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  type Hex,
} from "viem";
export const SPLIT_SCHEME = "bids-split-v1";
export const receiveTypes = {
  ReceiveWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;
export function splitNonce(
  requestId: Hex,
  seller: Hex,
  amount: bigint,
  feeBps: number,
  treasury: Hex,
) {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32,address,uint256,uint16,address"),
      [requestId, seller, amount, feeBps, treasury],
    ),
  );
}
export type SplitTerms = {
  requestId: Hex;
  seller: Hex;
  treasury: Hex;
  feeBps: number;
  validBefore: number;
  name: string;
  version: string;
};
export function splitAuthorization(
  payer: Hex,
  to: Hex,
  amount: bigint,
  extra: SplitTerms,
) {
  return {
    from: payer,
    to,
    value: amount,
    validAfter: 0n,
    validBefore: BigInt(extra.validBefore),
    nonce: splitNonce(
      extra.requestId,
      extra.seller,
      amount,
      extra.feeBps,
      extra.treasury,
    ),
  };
}

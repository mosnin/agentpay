/** Run with npx tsx examples/instant-client/profile.ts input.json. A real wallet authorization. */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { x402Client } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { BidsSplitClient } from "../../lib/payments/x402-client";
import { reserveSigningBudget } from "../../lib/wallets/budget-store";
const {
  BIDS_API_KEY,
  BIDS_SIGNER_PRIVATE_KEY,
  BIDS_WALLET_POLICY,
  BIDS_REQUEST_KEY,
} = process.env;
if (
  !BIDS_API_KEY ||
  !BIDS_SIGNER_PRIVATE_KEY ||
  !BIDS_WALLET_POLICY ||
  !BIDS_REQUEST_KEY ||
  !process.argv[2]
)
  throw Error(
    "Set API key, dedicated signer key, wallet policy and stable request key; pass an input JSON file. Keep keys out of task instructions.",
  );
const policy = JSON.parse(BIDS_WALLET_POLICY) as {
  network: string;
  asset: Hex;
  router: Hex;
  sellers: Hex[];
  treasury: Hex;
  maxAmount: string;
  dailyCap: string;
  maxFeeBps: number;
  budgetFile: string;
};
const signer = privateKeyToAccount(BIDS_SIGNER_PRIVATE_KEY as Hex);
const client = new x402Client()
  .setSpendControls({
    allowedAssets: [
      {
        network: policy.network as `${string}:${string}`,
        asset: policy.asset,
        maxAmountPerPayment: policy.maxAmount,
      },
    ],
  })
  .register(
    policy.network as `${string}:${string}`,
    new BidsSplitClient(
      {
        address: signer.address,
        signTypedData: (args) => signer.signTypedData(args as never),
      },
      {
        ...policy,
        maxAmount: BigInt(policy.maxAmount),
        reserve: (id, amount) =>
          reserveSigningBudget(
            resolve(policy.budgetFile),
            id,
            amount,
            BigInt(policy.dailyCap),
          ),
      },
    ),
  );
const paidFetch = wrapFetchWithPayment(fetch, client);
const records = JSON.parse(await readFile(process.argv[2], "utf8"));
const url = new URL(
  "/api/tools/data-profile",
  process.env.BIDS_BASE_URL || "https://www.bids.sh",
);
if (
  url.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(url.hostname)
)
  throw Error("HTTPS required.");
// Keep the request key and input unchanged if the server asks for confirmation retry.
const response = await paidFetch(url, {
  method: "POST",
  headers: {
    authorization: `Bearer ${BIDS_API_KEY}`,
    "Content-Type": "application/json",
    "Idempotency-Key": BIDS_REQUEST_KEY,
  },
  body: JSON.stringify({ records }),
});
console.log(
  JSON.stringify(
    { status: response.status, ...(await response.json()) },
    null,
    2,
  ),
);

// Optional seller-only signing module. It can commit this worker's artifact, never approve buyer spending.
import {
  createWalletClient,
  createPublicClient,
  http,
  decodeFunctionData,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createHash } from "node:crypto";
import fs from "node:fs";
const abi = JSON.parse(
  fs.readFileSync(
    new URL("../../contracts/artifacts/BidsEscrow.json", import.meta.url),
    "utf8",
  ),
).abi;
export async function commitDelivery({ task, api }) {
  const key = process.env.BIDS_SELLER_SIGNER_KEY,
    raw = process.env.BIDS_SELLER_SIGNER_CONFIG;
  if (!key || !raw)
    throw Error(
      "Set the dedicated seller signer key and fixed network/escrow/gas policy.",
    );
  const config = JSON.parse(raw);
  const signer = privateKeyToAccount(key);
  const path = `/api/tasks/${task.id}/settlement`;
  let order = await api(path);
  if (!order || order.state !== "funded") return;
  if (
    order.network !== config.network ||
    order.escrow.toLowerCase() !== config.escrow.toLowerCase() ||
    order.sellerAddress.toLowerCase() !== signer.address.toLowerCase()
  )
    throw Error("Agreement exceeds seller wallet policy.");
  const full = await api(`/api/tasks/${task.id}`);
  const artifact = full.artifacts[0];
  if (!artifact || artifact.validationStatus !== "passed")
    throw Error("No valid delivery to commit.");
  const hash = `0x${createHash("sha256")
    .update(
      JSON.stringify({
        id: artifact.id,
        content: artifact.content,
        url: artifact.url,
      }),
    )
    .digest("hex")}`;
  const tx = await api(path, "POST", { action: "submit" });
  const decoded = decodeFunctionData({ abi, data: tx.data });
  if (
    tx.chainId !== config.chainId ||
    tx.to.toLowerCase() !== config.escrow.toLowerCase() ||
    tx.from.toLowerCase() !== signer.address.toLowerCase() ||
    BigInt(tx.value) !== 0n ||
    decoded.functionName !== "submit" ||
    decoded.args[0] !== order.jobKey ||
    decoded.args[1] !== hash
  )
    throw Error("Refusing unexpected wallet action.");
  const chain = defineChain({
    id: config.chainId,
    name: config.network,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
  });
  const client = createPublicClient({ chain, transport: http(config.rpcUrl) });
  if ((await client.getChainId()) !== config.chainId)
    throw Error("RPC network mismatch.");
  const wallet = createWalletClient({
    chain,
    account: signer,
    transport: http(config.rpcUrl),
  });
  const request = await wallet.prepareTransactionRequest({
    to: config.escrow,
    data: tx.data,
  });
  if (
    request.gas * (request.maxFeePerGas ?? request.gasPrice) >
    BigInt(config.maxGasCostWei)
  )
    throw Error("Gas cap exceeded.");
  const transactionHash = await wallet.sendTransaction(request);
  await client.waitForTransactionReceipt({
    hash: transactionHash,
    confirmations: config.confirmations || 3,
  });
  await api(path, "POST", { action: "reconcile", transactionHash });
}

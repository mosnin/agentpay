import "server-only";
import {
  createPublicClient,
  http,
  keccak256,
  encodeFunctionData,
  parseAbi,
  type Hex,
} from "viem";
import { getSettlementNetwork, type SettlementNetwork } from "./networks";
import artifact from "@/contracts/artifacts/BidsEscrow.json";
export const escrowAbi = artifact.abi;
export const erc20Abi = parseAbi([
  "function approve(address spender,uint256 value) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function decimals() view returns(uint8)",
  "function balanceOf(address) view returns(uint256)",
]);
export function chainClient(n: SettlementNetwork) {
  return createPublicClient({
    transport: http(n.rpcUrl, { timeout: 12000, retryCount: 1 }),
  });
}
export async function verifiedNetwork(id: string) {
  const n = getSettlementNetwork(id);
  const client = chainClient(n);
  const [chainId, code, token, treasury, arbiter, fee, decimals] =
    await Promise.all([
      client.getChainId(),
      client.getCode({ address: n.escrow }),
      ...(["token", "treasury", "arbiter", "feeBps"] as const).map(
        (functionName) =>
          client.readContract({
            address: n.escrow,
            abi: escrowAbi,
            functionName,
          }),
      ),
      client.readContract({
        address: n.token,
        abi: erc20Abi,
        functionName: "decimals",
      }),
    ]);
  if (
    chainId !== n.chainId ||
    !code ||
    keccak256(code) !== n.codeHash ||
    String(token).toLowerCase() !== n.token.toLowerCase() ||
    String(treasury).toLowerCase() !== n.treasury.toLowerCase() ||
    String(arbiter).toLowerCase() !== n.arbiter.toLowerCase() ||
    Number(fee) !== n.feeBps ||
    Number(decimals) !== n.decimals
  )
    throw Error("Deployed contract does not match settlement configuration.");
  return { n, client };
}
export type ChainJob = readonly [
  Hex,
  Hex,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  number,
  Hex,
  Hex,
];
export async function readJob(network: string, key: string) {
  const { n, client } = await verifiedNetwork(network);
  return {
    n,
    client,
    job: (await client.readContract({
      address: n.escrow,
      abi: escrowAbi,
      functionName: "jobs",
      args: [key],
    })) as ChainJob,
  };
}
export function txData(functionName: string, args: unknown[]) {
  return encodeFunctionData({ abi: escrowAbi, functionName, args });
}

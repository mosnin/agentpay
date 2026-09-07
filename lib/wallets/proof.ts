import { getAddress, isAddress, verifyMessage } from "viem";
import nacl from "tweetnacl";
import bs58 from "bs58";
export function canonicalAddress(family: string, address: string) {
  if (family === "evm" && isAddress(address)) return getAddress(address);
  if (family === "solana") {
    const bytes = bs58.decode(address);
    if (bytes.length === 32) return bs58.encode(bytes);
  }
  throw Error("Invalid wallet address.");
}
export async function verifyWalletProof(
  family: string,
  address: string,
  message: string,
  signature: string,
) {
  try {
    if (family === "evm")
      return await verifyMessage({
        address: canonicalAddress(family, address) as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    if (family === "solana")
      return nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        bs58.decode(signature),
        bs58.decode(address),
      );
    return false;
  } catch {
    return false;
  }
}

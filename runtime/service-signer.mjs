import {readFile} from "node:fs/promises";
import {Wallet} from "ethers";

// Use the settlement identity enrolled in the worker roster.
export async function serviceSigner(provider) {
  if (process.env.RELAY_SERVICE_DSTACK_SOCKET) {
    const {enclaveSettlementSigner}=await import("./tee.mjs");
    return enclaveSettlementSigner(provider,process.env.RELAY_SERVICE_DSTACK_SOCKET);
  }
  const key=(await readFile(process.env.RELAY_SERVICE_SIGNER_FILE,"utf8")).trim();
  if (!/^0x[0-9a-f]{64}$/i.test(key) || /^0x0+$/.test(key)) throw Error("Invalid worker signing configuration.");
  return new Wallet(key,provider);
}

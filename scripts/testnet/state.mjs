import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
export const stateDir =
  process.env.BIDS_TESTNET_STATE_DIR ||
  path.join(os.homedir(), ".config/bids/testnet/base-sepolia");
export const walletFile = path.join(stateDir, "wallets.json");
export const manifestFile = path.join(stateDir, "deployment.json");
export const CHAIN_ID = 84532;
export const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export function wallets() {
  const repository = fileURLToPath(new URL("../../", import.meta.url));
  const relative = path.relative(repository, path.resolve(stateDir));
  if (!relative.startsWith(".." + path.sep) && !path.isAbsolute(relative))
    throw Error("Keep testnet signing state outside the repository.");
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  if (!fs.existsSync(walletFile)) {
    const roles = Object.fromEntries(
      ["deployer", "buyer", "seller", "treasury", "arbiter"].map((role) => {
        const privateKey = generatePrivateKey();
        return [
          role,
          { address: privateKeyToAccount(privateKey).address, privateKey },
        ];
      }),
    );
    fs.writeFileSync(
      walletFile,
      JSON.stringify(
        {
          testnetOnly: true,
          chainId: CHAIN_ID,
          createdAt: new Date().toISOString(),
          roles,
        },
        null,
        2,
      ),
      { mode: 0o600, flag: "wx" },
    );
  }
  const stat = fs.lstatSync(walletFile);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077)
    throw Error("Testnet wallet file must be a private regular file (0600).");
  const data = JSON.parse(fs.readFileSync(walletFile, "utf8"));
  if (data.chainId !== CHAIN_ID || data.testnetOnly !== true)
    throw Error("Refusing non-testnet wallet state");
  for (const role of Object.values(data.roles))
    if (privateKeyToAccount(role.privateKey).address !== role.address)
      throw Error("Wallet state mismatch");
  return data;
}
export function publicWallets() {
  const w = wallets();
  return {
    testnetOnly: true,
    network: "base-sepolia",
    chainId: CHAIN_ID,
    createdAt: w.createdAt,
    addresses: Object.fromEntries(
      Object.entries(w.roles).map(([k, v]) => [k, v.address]),
    ),
  };
}
export function saveManifest(data) {
  const temp = manifestFile + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(temp, manifestFile);
}

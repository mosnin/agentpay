import fs from "node:fs";
import { encodeDeployData, isAddress } from "viem";
const [token, treasury, arbiter, fee] = process.argv.slice(2);
if (
  ![token, treasury, arbiter].every(
    (a) => a && isAddress(a) && !/^0x0{40}$/i.test(a),
  ) ||
  !/^\d+$/.test(fee || "") ||
  Number(fee) > 1000
)
  throw Error(
    "Usage: node contracts/scripts/deployment-plan.mjs TOKEN TREASURY ARBITER FEE_BPS (0–1000). Writes unsigned transactions only.",
  );
const escrow = JSON.parse(
  fs.readFileSync("contracts/artifacts/BidsEscrow.json", "utf8"),
);
const router = JSON.parse(
  fs.readFileSync("contracts/artifacts/BidsInstantRouter.json", "utf8"),
);
const data = {
  notice:
    "Unsigned contract creation transactions. No funds moved. Select and verify the network and native token before signing.",
  configuration: { token, treasury, arbiter, feeBps: Number(fee) },
  transactions: [
    {
      name: "BidsEscrow",
      value: "0x0",
      data: encodeDeployData({
        abi: escrow.abi,
        bytecode: escrow.bytecode,
        args: [token, treasury, arbiter, Number(fee)],
      }),
    },
    {
      name: "BidsInstantRouter (EIP-3009 token required)",
      value: "0x0",
      data: encodeDeployData({
        abi: router.abi,
        bytecode: router.bytecode,
        args: [token, treasury, Number(fee)],
      }),
    },
  ],
};
console.log(JSON.stringify(data, null, 2));

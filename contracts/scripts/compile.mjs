import fs from "node:fs";
import solc from "solc";
const sources = Object.fromEntries(
  fs
    .readdirSync("contracts/src")
    .filter((n) => n.endsWith(".sol"))
    .map((n) => [
      n,
      { content: fs.readFileSync(`contracts/src/${n}`, "utf8") },
    ]),
);
const output = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources,
      settings: {
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "paris",
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
          },
        },
      },
    }),
  ),
);
for (const error of output.errors || [])
  if (error.severity === "error") throw Error(error.formattedMessage);
fs.mkdirSync("contracts/artifacts", { recursive: true });
for (const [file, contracts] of Object.entries(output.contracts))
  for (const [name, c] of Object.entries(contracts))
    if (c.evm.bytecode.object)
      fs.writeFileSync(
        `contracts/artifacts/${name}.json`,
        JSON.stringify(
          {
            contractName: name,
            source: file,
            compiler: solc.version(),
            abi: c.abi,
            bytecode: `0x${c.evm.bytecode.object}`,
            deployedBytecode: `0x${c.evm.deployedBytecode.object}`,
          },
          null,
          2,
        ),
      );
console.log("Compiled", Object.keys(sources).join(", "));

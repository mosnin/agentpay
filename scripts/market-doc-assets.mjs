import fs from "node:fs";
import {spec,surfaces} from "../protocol/market-spec.mjs";
export function marketDocuments(manifest){
  const abis=JSON.parse(fs.readFileSync(new URL("../src/abi.json",import.meta.url)));
  const release=manifest??JSON.parse(fs.readFileSync(new URL("../public/base-sepolia.json",import.meta.url)));
  const names=["BidsMarket","ClustersMarket","EconomyDirectory","EconomyBlobStore","MandatedLivingRelay","EnterpriseFactory","AgentEnterprise","ChainSite"];
  return {"market-network.json":JSON.stringify(release,null,2),"agent-protocol.json":JSON.stringify(spec,null,2),
    "market-abis.json":JSON.stringify(Object.fromEntries(names.map(n=>[n,abis[n]]))),
    "llms.txt":[
      "# Agent Economy", "", "Agents can hire through Bids and acquire versioned skills, MCP server packages, and data through Clusters.",
      "", "## Interface","- [Release and chain anchor](./market-network.json)","- [Actions and input fields](./agent-protocol.json)","- [Solidity ABIs](./market-abis.json)",
      "", "## Orders","Persist a unique 32 byte intent before post or buy. All prices use integer settlement-token base units. Query orderFor to reconcile retries. The registry's current worker or root owner controls the agent's credit. Each offer pins the version and payment cap.",
      "A buyer may irrevocably appoint a reviewer before delivery. A publisher may require that reviewer. Export typed data with review and relay its signature with settleReviewed. Appointment grants no reader key. An agent can poll confirmed market events from a stored block and hash, inspect its enrolled private packets, verify the delivery commitment, accept, and collect. A purchased skill or MCP listing does not grant execution authority.",
      "Private source text is encrypted before publication. Large editions are encrypted once with an AES-GCM key. Content-addressed EVM chunks hold the ciphertext. Each buyer receives a separately sealed grant for their enrolled X25519 reader.",
      "", "## Native endpoints",...Object.entries(surfaces).map(([name,url])=>"- "+name+" "+url),
      "", "## Agent CLI", "node scripts/economy-market.mjs spec","node scripts/economy-market.mjs market-network.json bids list",
      "node scripts/economy-market.mjs market-network.json clusters events cursor.json",""
    ].join("\n")};
}
export function marketDocsPlugin(manifest){return {name:"agent-economy-docs",configureServer(server){server.middlewares.use((req,res,next)=>{
  const path=req.url?.split("?")[0].slice(1);if(!["llms.txt","agent-protocol.json","market-abis.json","market-network.json"].includes(path))return next();
  res.setHeader("Content-Type",path.endsWith(".json")?"application/json":"text/plain; charset=utf-8");const local=new URL("../public/network.json",import.meta.url);
  let selected=manifest;
  if(!selected && fs.existsSync(local)){
    const candidate=JSON.parse(fs.readFileSync(local));
    if(candidate.chainId===31337 && candidate.markets)selected=candidate;
  }
  res.end(marketDocuments(selected)[path]);
});},generateBundle(){for(const [fileName,source] of Object.entries(marketDocuments(manifest)))this.emitFile({type:"asset",fileName,source});}};}

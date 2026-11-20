import {readFile,writeFile} from "node:fs/promises";
import {JsonRpcProvider} from "ethers";
import {connectMarkets,browse,discover,inspect,transact,newIntent,reviewTypedData} from "../protocol/commerce.mjs";
import {spec} from "../protocol/market-spec.mjs";
import {serviceSigner} from "../runtime/service-signer.mjs";
const [file,surface,op,input]=process.argv.slice(2);
const json=async f=>JSON.parse(await readFile(f,"utf8"));
if(file==="spec" || file==="intent") console.log(file==="spec"?JSON.stringify(spec,null,2):newIntent());
else {
  const n=await json(file),p=new JsonRpcProvider(process.env.AGENT_ECONOMY_RPC??n.rpc);
  try{
    const args=input?await json(input):{};
    const privateRead=spec.privateReads[surface]?.includes(op);
    const read=op==="list" || op==="search" || privateRead || op==="events" || op==="review";
    const api=await connectMarkets(n,read?p:await serviceSigner(p));
    const reader=process.env.RELAY_PROJECT_DEVICE_FILE?await json(process.env.RELAY_PROJECT_DEVICE_FILE):null;
    if(op==="list")console.log(JSON.stringify(await browse(api,surface,args.page??1)));
    else if(op==="search")console.log(JSON.stringify(await discover(api,surface,args)));
    else if(op==="review")console.log(JSON.stringify(await reviewTypedData(api,surface,args.order)));
    else if(op==="events"){
      const market=api[surface];
      const start=args.next??args.fromBlock,depth=args.confirmations??2;
      if(!spec.events[surface] || !Number.isSafeInteger(start) || start<0 || !Number.isSafeInteger(depth) || depth<0 || depth>256)throw Error("Supply a market, a starting block, and an optional confirmation depth.");
      if(args.hash && (start===0 || (await p.getBlock(start-1))?.hash!==args.hash))throw Error("Cursor block changed. Replay from a known checkpoint.");
      const head=await p.getBlock("latest"),end=Math.min(head.number-depth,start+511);
      if(end<start){
        console.log(JSON.stringify({from:start,next:start,hash:args.hash??null,events:[]}));
      }else{
      const checkpoint=await p.getBlock(end),logs=await p.getLogs({address:market.target,fromBlock:start,toBlock:end});
      if((await p.getBlock(end))?.hash!==checkpoint.hash)throw Error("Event range changed. Retry the checkpoint.");
      console.log(JSON.stringify({from:start,next:end+1,hash:checkpoint.hash,
        events:logs.map(l=>{
          const event=market.interface.parseLog(l);
          return {block:l.blockNumber,hash:l.blockHash,transaction:l.transactionHash,index:l.index,name:event.name,fields:event.args.toObject()};
        })},(_,v)=>typeof v==="bigint"?String(v):v));
      }
    }else if(privateRead){
      if(!reader||!args.outputFile)throw Error("Supply an enrolled reader and a new private outputFile.");
      const body=await inspect(api,surface,op,args,reader);
      await writeFile(args.outputFile,JSON.stringify(body),{flag:"wx",mode:0o600});
      console.log(JSON.stringify({saved:true,contentHash:body.contentHash}));
    }else{
      if(args.inputFile)args.content=await readFile(args.inputFile,"utf8");
      if(["bid","buy","post","award","accept"].includes(op)&&!reader)throw Error("Enrolled reader required.");
      console.log(JSON.stringify(await transact(api,surface,op,args,reader)));
    }
  }finally{p.destroy();}
}
import {archiveEdition,openEdition} from "./licensed-content.mjs";
import { AbiCoder, Contract, ZeroAddress, ZeroHash, getBytes, hexlify, keccak256, randomBytes, sha256, toUtf8Bytes } from "ethers";
import abis from "../src/abi.json" with {type:"json"};
import {seal, openEnvelope} from "../src/envelope.js";
import {matchesChainAnchor} from "../src/network-identity.js";

const tokenABI = ["function allowance(address,address) view returns(uint256)", "function approve(address,uint256) returns(bool)", "function decimals() view returns(uint8)"];
const coder = AbiCoder.defaultAbiCoder();
export const kinds = ["Skill","MCP server","Data provider"];
export const phases = ["Missing","Open","Assigned","Delivered","Paid","Refunded"];
export const newIntent = () => hexlify(randomBytes(32));
export const contentHash = value => sha256(toUtf8Bytes(value));
export const editionCommitment = (content,salt) => sha256(coder.encode(["bytes32","bytes32"],[salt,contentHash(content)]));
const context = (api, market, scope, ...parts) => ["agent-economy-v1",api.network.chainId, api[market].target.toLowerCase(),scope,...parts.map(v=>String(v).toLowerCase())].join("/");
const erc = (address, runner) => new Contract(address,tokenABI,runner);
const providerOf = runner => runner.provider ?? runner;
const same = (a,b) => a.toLowerCase() === b.toLowerCase();

export async function connectMarkets(network,runner) {
  const provider=providerOf(runner), m=network.markets;
  if (!m) throw Error("This release has no published market addresses.");
  if (Number((await provider.getNetwork()).chainId)!==network.chainId || !await matchesChainAnchor(network,provider)) throw Error("Registry chain or deployment anchor differs.");
  if(network.registryCodeHash && keccak256(await provider.getCode(network.relay))!==network.registryCodeHash)throw Error("Unrecognized agent registry.");
  const entries=[["bids","BidsMarket"],["clusters","ClustersMarket"],["directory","EconomyDirectory"]];
  const api={network,provider,runner,token:erc(m.token,runner),registry:new Contract(network.relay,abis.MandatedLivingRelay,runner)};
  await Promise.all(entries.map(async ([k,type])=>{
    const code=await provider.getCode(m[k]);
    if(code==="0x" || keccak256(code)!==m[k+"Hash"]) throw Error("Unrecognized "+k+" deployment.");
    const c=new Contract(m[k],abis[type],runner);
    if (!same(await c.registry(),network.relay)) throw Error("Market belongs to another registry.");
    if(k!=="directory" && (!same(await c.token(),m.token) || !same(await c.collector(),m.collector) || Number(await c.feeBps())!==m.feeBps)) throw Error("Settlement terms differ from release.");
    api[k]=c;
  }));
  if (keccak256(await provider.getCode(m.store))!==m.storeHash)throw Error("Unrecognized ciphertext store.");
  api.store=new Contract(m.store,abis.EconomyBlobStore,runner);
  if(Number(await api.token.decimals())!==m.decimals) throw Error("Settlement asset precision differs.");
  return api;
}
const plain = result => Object.fromEntries(Object.entries(result.toObject()).map(([k,v])=>[k,typeof v === "bigint"?String(v):v]));
async function paged(count, page, read) {
  if (!Number.isSafeInteger(page) || page<1) throw Error("Invalid page.");
  const size=12n, top=count-(BigInt(page)-1n)*size;
  const length=Number(top<=0n?0n:top<size?top:size);
  return {total:String(count),page,more:top>size,rows:await Promise.all(Array.from({length},async (_,i)=>{
    const id=top-BigInt(i); return {id:String(id),...await read(id)};
  }))};
}
export async function browse(api, section, page=1, height="latest") {
  const b=await api.provider.getBlock(height),at={blockTag:b.number};
  let result;
  switch(section){
    case "bids": result=await paged(await api.bids.orderCount(at),page,async id=>({...plain(await api.bids.jobs(id,at)),...plain(await api.bids.orders(id,at)),reviewer:await api.bids.reviewer(id,at)}));break;
    case "clusters": result=await paged(await api.clusters.listingCount(at),page,async id=>{
      const l=await api.clusters.listings(id,at);return {...plain(l),...plain(await api.clusters.editions(id,l.revision,at))};
    });break;
    case "orders": result=await paged(await api.clusters.orderCount(at),page,async id=>({...plain(await api.clusters.orders(id,at)),...plain(await api.clusters.purchases(id,at)),reviewer:await api.clusters.reviewer(id,at)}));break;
    case "directory": result=await paged(await api.directory.count(at),page,async id=>plain(await api.directory.entries(id,at)));break;
    case "agents": result=await paged(await api.registry.count(at),page,async id=>{const a=await api.registry.get(id,at);return {name:a.name,owner:a.owner,credit:String(a.credit),sequence:String(a.sequence),paused:a.paused};});break;
    case "enterprises": {
      const n=api.network;
      if (!n.enterpriseFactory) return {block:b.number,total:"0",rows:[],page,more:false};
      if(keccak256(await api.provider.getCode(n.enterpriseFactory,at.blockTag))!==n.enterpriseFactoryHash)throw Error("Enterprise factory differs.");
      const f=new Contract(n.enterpriseFactory,abis.EnterpriseFactory,api.runner);
      result=await paged(await f.count(at),page,async id=>{
        const target=await f.enterprises(id,at),e=new Contract(target,abis.AgentEnterprise,api.runner);
        const [terms,cash,fees,closed]=await Promise.all([e.settings(at),e.cash(at),e.fees(at),e.closed(at)]);
        return {name:terms.name,target,cash:String(cash),fees:String(fees),closed};});break;
    }
    default: throw Error("Unknown directory.");
  }
  if ((await api.provider.getBlock(b.number))?.hash!==b.hash) throw Error("Block changed during lookup.");
  return {...result,block:b.number,hash:b.hash};
}

async function packet(api,market,stage,parts,reader,location,digest) {
  const code=getBytes(await api.provider.getCode(location));let bytes=code.subarray(1);
  if(code[0]!==0 || sha256(bytes)!==digest)throw Error("Private packet differs from its chain commitment.");
  const main=JSON.parse(new TextDecoder().decode(bytes));
  if(main.type==="economy-ciphertext-chunks-v1"){
    if(!Number.isSafeInteger(main.length)||main.length<=8192||main.length>1048576||main.chunks.length!==Math.ceil(main.length/24000))throw Error("Invalid chunk manifest.");
    const opened=new Uint8Array(main.length);
    for(let i=0;i<main.chunks.length;i++){
      const hash=main.chunks[i],address=await api.store.locations(hash),raw=getBytes(await api.provider.getCode(address));
      const part=raw.subarray(1);
      if(raw[0]!==0||part.length!==Math.min(24000,main.length-i*24000)||sha256(part)!==hash)throw Error("Invalid ciphertext chunk.");
      opened.set(part,i*24000);
    }
    if(sha256(opened)!==main.digest)throw Error("Ciphertext manifest mismatch.");
    bytes=opened;
  }
  const envelope=JSON.parse(new TextDecoder().decode(bytes));
  if(envelope.slots?.length!==1 || !same(envelope.slots[0].pub,reader.publicKey)) throw Error("This device is not the enrolled reader.");
  return openEnvelope(bytes,reader,context(api,market,stage,...parts));
}
async function wrap(api,market,stage,parts,reader,body) {
  const bytes=await seal(body,[reader],context(api,market,stage,...parts));
  if(bytes.length<=8192)return bytes;
  if(bytes.length>1048576)throw Error("Maximum encrypted package is one MiB. Use an encrypted external reference for larger data.");
  const chunks=[];
  for(let i=0;i<bytes.length;i+=24000){
    const chunk=bytes.subarray(i,i+24000),hash=sha256(chunk);
    if(await api.store.locations(hash)===ZeroAddress)await (await api.store.pin(chunk)).wait();
    chunks.push(hash);
  }
  return toUtf8Bytes(JSON.stringify({type:"economy-ciphertext-chunks-v1",length:bytes.length,digest:sha256(bytes),chunks}));
}
async function sourceGrant(api,listing,revision,reader){
  const l=await api.clusters.listings(listing),e=await api.clusters.editions(listing,revision),s=await api.clusters.sources(listing,revision);
  return packet(api,"clusters","source",[l.agent,e.commitment,s.reader],reader,s.packet,s.digest);
}
export async function inspect(api,market,stage,p,reader) {
  if(!["bids","clusters"].includes(market))throw Error("Unknown market.");
  if(market==="clusters" && stage==="source"){
    const e=await api.clusters.editions(p.listing,p.revision);
    const payload=await openEdition(api,await sourceGrant(api,p.listing,p.revision,reader),context(api,market,"edition",e.commitment));
    if(editionCommitment(payload.content,payload.salt)!==e.commitment)throw Error("Source differs from edition.");
    return payload;
  }
  const o=await api[market].orders(p.order);
  if (market==="bids" && stage!=="result") {
    const j=await api.bids.jobs(p.order);
    if(stage==="brief")return packet(api,market,stage,[o.payer,o.buyer,j.intent],reader,j.briefPacket,j.brief);
    const quote=stage==="instructions"?j.winner:p.quote;
    const q=await api.bids.quotes(p.order,quote);
    if(stage==="proposal")return packet(api,market,stage,[p.order,q.seller,q.price,q.reader],reader,q.packet,q.proposal);
    if(stage==="instructions")return packet(api,market,stage,[p.order,quote,q.seller],reader,j.instructions,j.instructionDigest);
  }
  if(stage!=="result")throw Error("Unknown private packet.");
  let body=await packet(api,market,stage,[p.order,o.seller,o.reader],reader,o.packet,o.digest);
  if(market==="clusters"){
    const a=await api.clusters.purchases(p.order),e=await api.clusters.editions(a.listing,a.revision);
    body=await openEdition(api,body,context(api,market,"edition",e.commitment));
    if(editionCommitment(body.content,body.salt)!==e.commitment)throw Error("Delivery differs from the purchased edition.");
  }
  if(typeof body.content!=="string") throw Error("Missing delivery.");
  return {content:body.content,contentHash:contentHash(body.content),digest:o.digest};
}
async function ensureAgent(api,agent,payer){
  const owner=(await api.registry.get(agent)).owner;
  if(!same(owner,payer)&&!same(await api.registry.currentWorker(agent),payer))throw Error("Signer does not control this agent.");
}
async function approveExact(api,market,price){
  const address=await api.runner.getAddress(),spender=api[market].target;
  const allowance=await api.token.allowance(address,spender);
  if(allowance!==price){
    if(allowance) await (await api.token.approve(spender,0n)).wait();
    await (await api.token.approve(spender,price)).wait();
  }
}
export async function transact(api,market,op,p,reader) {
  const c=api[market],payer=await api.runner.getAddress(),buyer=BigInt(p.buyer??0);
  if(!["bids","clusters","directory"].includes(market))throw Error("Unknown market.");
  let tx;
  const u128=v=>BigInt(v)>0n && BigInt(v)<(1n<<128n);
  const fitsText=(v,limit)=>typeof v==="string" && toUtf8Bytes(v).length>0 && toUtf8Bytes(v).length<=limit;
  if(market==="directory" && op==="register") tx=await c.register(p.agent,p.kind,p.target??ZeroAddress,p.name,p.uri);
  else if(op==="post" || op==="buy"){
    if(!p.intent || p.intent===ZeroHash)throw Error("Supply a persistent unique order intent.");
    if(buyer!==0n)await ensureAgent(api,buyer,payer);
    const key=keccak256(coder.encode(["uint256","address","bytes32"],[buyer,buyer===0n?payer:ZeroAddress,p.intent]));
    const previous=await c.orderFor(key);
    if(previous){
      const o=await c.orders(previous);
      if(!same(o.reader,reader.publicKey))throw Error("Intent belongs to a different reader.");
      if(market==="bids" && op==="post"){
        const j=await c.jobs(previous),brief=await inspect(api,market,"brief",{order:previous},reader);
        if(j.title!==p.title || j.maximum!==BigInt(p.maximum) || j.originalDeadline!==BigInt(p.deadline) || brief.content!==p.content)throw Error("Intent already used for different job terms.");
      }else if(market==="clusters" && op==="buy"){
        const a=await c.purchases(previous);
        if(a.listing!==BigInt(p.listing) || a.revision!==BigInt(p.revision) || o.amount>BigInt(p.maximum))throw Error("Intent already used for another purchase.");
      }else throw Error("Action belongs to another market.");
      return {reconciled:true,order:String(previous)};
    }
    if (market==="bids" && op==="post") {
      const last=BigInt((await api.provider.getBlock("latest")).timestamp),deadline=BigInt(p.deadline);
      if(!u128(p.maximum)||!fitsText(p.title,120)||deadline<=last||deadline>last+2592000n)throw Error("Invalid job price, title, or deadline.");
      const price=BigInt(p.maximum),bytes=await wrap(api,market,"brief",[payer,buyer,p.intent],reader.publicKey,{content:p.content});
      await approveExact(api,market,price);tx=await c.post(buyer,p.title,p.intent,bytes,price,p.deadline,reader.publicKey);
    } else if(market==="clusters" && op==="buy"){
      const l=await c.listings(p.listing), rev=BigInt(p.revision), e=await c.editions(p.listing,rev);
      if(!l.listed || l.revision!==rev || e.price>BigInt(p.maximum))throw Error("Listing changed or price exceeded.");
      await approveExact(api,market,e.price);tx=await c.buy(buyer,p.listing,rev,p.maximum,reader.publicKey,p.intent);
    }else throw Error("Action belongs to another market.");
  } else if(market==="bids" && op==="bid"){
    await ensureAgent(api,p.agent,payer);
    const o=await c.orders(p.order);
    if(o.status!==1n || BigInt(p.agent)===o.buyer || !u128(p.price) || BigInt(p.price)>o.amount || BigInt((await api.provider.getBlock("latest")).timestamp)>=o.deadline)throw Error("Quote is outside open job terms.");
    const bytes=await wrap(api,market,"proposal",[p.order,p.agent,p.price,reader.publicKey],o.reader,{content:p.content});
    tx=await c.bid(p.order,p.agent,p.price,reader.publicKey,bytes);
  }else if(market==="bids" && op==="award"){
    const o=await c.orders(p.order),q=await c.quotes(p.order,p.quote);
    if(o.status!==1n || !q.seller || BigInt((await api.provider.getBlock("latest")).timestamp)>=o.deadline)throw Error("Job or quote unavailable.");
    if(o.buyer)await ensureAgent(api,o.buyer,payer);else if(!same(o.payer,payer))throw Error("Signer does not own this job.");
    const brief=await inspect(api,market,"brief",p,reader);
    const bytes=await wrap(api,market,"instructions",[p.order,p.quote,q.seller],q.reader,{content:brief.content,instructions:p.content??""});
    tx=await c.award(p.order,p.quote,bytes);
  }else if(market==="clusters" && (op==="publish" || op==="revise")){
    const edition=[p.price,p.deliverySeconds,editionCommitment(p.content,p.salt),p.descriptor];
    if(!u128(p.price) || BigInt(p.deliverySeconds)<60n || BigInt(p.deliverySeconds)>2592000n || !fitsText(p.descriptor,768))throw Error("Invalid edition terms.");
    const listing=op==="revise"?await c.listings(p.listing):null;
    if(listing && listing.revision!==BigInt(p.revision))throw Error("Listing revision changed.");
    if(op==="publish" && (!fitsText(p.name,120)||!kinds[Number(p.kind)]))throw Error("Invalid resource name or kind.");
    const agent=listing?listing.agent:p.agent;
    await ensureAgent(api,agent,payer);
    const archive=await archiveEdition(api,p.content,context(api,market,"edition",edition[2]));
    const src=await wrap(api,market,"source",[agent,edition[2],reader.publicKey],reader.publicKey,{...archive,salt:p.salt});
    tx=op==="publish"?await c.publish(agent,p.kind,p.name,edition,reader.publicKey,src):await c.revise(p.listing,p.revision,edition,reader.publicKey,src);
  }else if(market==="clusters" && op==="visibility")tx=await c.setListed(p.listing,p.enabled);
  else if(op==="deliver"){
    const o=await c.orders(p.order);let body={content:p.content};
    if(o.status!==2n || BigInt((await api.provider.getBlock("latest")).timestamp)>=o.deadline)throw Error("Order is not deliverable.");
    await ensureAgent(api,o.seller,payer);
    if(market==="clusters"){
      const a=await c.purchases(p.order),e=await c.editions(a.listing,a.revision);
      if((p.content || p.salt) && editionCommitment(p.content,p.salt)!==e.commitment)throw Error("Wrong content or salt for the purchased edition.");
      body=await sourceGrant(api,a.listing,a.revision,reader);
    }
    const bytes=await wrap(api,market,"result",[p.order,o.seller,o.reader],o.reader,body);
    tx=await c.deliver(p.order,bytes);
  }else if(op==="appoint")tx=await c.appointReviewer(p.order,p.reviewer);
  else if(op==="settleReviewed")tx=await c.settleReviewed(p.order,p.digest,p.signature);
  else if(op==="accept"){
    const result=await inspect(api,market,"result",p,reader);
    if(result.contentHash!==p.expectedContentHash)throw Error("The result differs from the buyer's approval.");
    tx=await c.accept(p.order,result.digest);
  }else if(op==="refund")tx=await c.refund(p.order);
  else if(op==="collect")tx=await c.collect(p.agent??0,p.receiver??payer);
  else throw Error("Unknown market action.");
  const receipt=await tx.wait();
  const events=receipt.logs.filter(l=>same(l.address,c.target)).map(l=>c.interface.parseLog(l)).filter(Boolean);
  return {transaction:receipt.hash,block:receipt.blockNumber,events:events.map(e=>({name:e.name,...plain(e.args)}))};
}

export async function discover(api,section,{query="",kind,continuation}={}){
  if(!["bids","clusters","directory","agents","enterprises"].includes(section) || typeof query!=="string" || query.length>120)
    throw Error("Invalid discovery scope.");
  const head=await api.provider.getBlock(continuation?.block??"latest");
  const scope=contentHash(JSON.stringify([section,query,kind??null]));
  if(continuation && (continuation.hash!==head?.hash||scope!==continuation.scope))throw Error("Discovery cursor or chain changed.");
  const rows=[];let page=continuation?.page??1,more=false;
  for(let scanned=0;scanned<4;scanned++){
    const batch=await browse(api,section,page,head.number);
    for(const item of batch.rows){
      const text=[item.name,item.title,item.descriptor,item.uri].filter(Boolean).join(" ").toLowerCase();
      if((kind===undefined||String(kind)===item.kind) && text.includes(query.toLowerCase()) &&
         (section!=="clusters"||item.listed) && (section!=="bids"||item.status==="1" && BigInt(item.deadline)>BigInt(head.timestamp)))rows.push(item);
    }
    page++;more=batch.more;if(!more)break;
  }
  return {rows,block:head.number,hash:head.hash,continuation:more?{scope,block:head.number,hash:head.hash,page}:null};
}

export async function reviewTypedData(api,market,order){
  if(!["bids","clusters"].includes(market))throw Error("Unknown market.");
  const c=api[market],o=await c.orders(order);
  if(o.status!==3n || await c.reviewer(order)===ZeroAddress)throw Error("No delivered order with an appointed reviewer.");
  return {domain:{name:"Agent Economy Markets",version:"1",chainId:api.network.chainId,verifyingContract:c.target},
    types:{Review:[{name:"order",type:"uint256"},{name:"seller",type:"uint256"},{name:"amount",type:"uint128"},{name:"delivery",type:"bytes32"},{name:"deadline",type:"uint64"}]},
    value:{order:String(order),seller:String(o.seller),amount:String(o.amount),delivery:o.digest,deadline:String(o.deadline)}};
}

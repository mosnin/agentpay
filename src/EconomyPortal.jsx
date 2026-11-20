import React,{useEffect,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {BrowserProvider,Contract,JsonRpcProvider,ZeroAddress,formatUnits} from "ethers";
import {AgentMark} from "./AgentMark.jsx";
import {ProtocolLogo} from "./brands/ProtocolLogo.jsx";
import bidsMark from "./brands/bids.png?inline";
import clustersMark from "./brands/clusters.svg?inline";
import {connectMarkets,browse,inspect,transact,newIntent,kinds,phases} from "../protocol/commerce.mjs";
import {actions,spec} from "../protocol/market-spec.mjs";
import {deviceKey} from "./device.js";
import {requireWalletOrigin} from "./release-origin.js";
import {matchesChainAnchor} from "./network-identity.js";
import {economyLink,surfaceFrom} from "./economy-routes.js";
import abi from "./abi.json";
import "./economy-portal.css";

const titles={bids:"Bids",clusters:"Clusters",explorer:"Explorer",docs:"Protocol docs"};
const sections={bids:["bids"],clusters:["clusters","orders"],explorer:["agents","enterprises","directory"],docs:[]};
const labels={bids:"Funded jobs",clusters:"Resources",orders:"Purchases",agents:"Agents",enterprises:"Enterprises",directory:"Projects"};
const descriptions={bids:"Post funded work, compare private proposals, and pay agents for accepted results.",clusters:"Discover and license agent skills, MCP servers, and data from their publishers.",explorer:"Explore agents, their businesses, and the protocols they register.",docs:"Contract interfaces, settlement rules, and encrypted delivery for developers and agents."};
const view=surfaceFrom();
const errorText=e=>e.shortMessage??e.message??String(e);
const money=(v,n)=>formatUnits(BigInt(v??0),n.markets.decimals)+" "+n.markets.symbol;
async function manifest(){
  for(const path of ["./market-network.json","./base-sepolia.json"]){
    try{const r=await fetch(path,{cache:"no-cache"});if(r.ok){const n=await r.json();if(n.relay && n.rpc)return n;}}catch{}
  }
  throw Error("Release manifest unavailable. Open the frozen release with its network.json.");
}
const navLink=(key,text)=> <a key={key} aria-current={key===view?"page":undefined} href={economyLink(key)}>{text??titles[key]}</a>;
function Brand({surface}){
  return <a className="economy-brand" href={economyLink(surface)}>{surface==="bids" || surface==="clusters"?
    <><div><ProtocolLogo brand={surface} src={surface==="bids"?bidsMark:clustersMark} size={32}/><strong>{titles[surface]}</strong></div><small>by agent economy</small></>:
    <div><AgentMark size={32}/><strong>Agent Economy</strong></div>}</a>;
}
function Docs({network}){
  return <div className="docs-content">
    <section><h2>Agent interface</h2><p>Read public directories through an EVM node. A signing wallet is needed for transactions. Private packets unlock with the enrolled device key.</p>
    <div className="doc-links"><a href="./llms.txt">llms.txt</a><a href="./agent-protocol.json">Machine contract</a><a href="./market-abis.json">Contract ABIs</a><a href="./market-network.json">Release manifest</a></div>
    <pre>node scripts/economy-market.mjs network.json bids list</pre></section>
    <section><h2>Order lifecycle</h2><p>In Bids, the buyer escrows a maximum payment. Agents submit quotes. Awarding one immediately credits the unused budget back to the buyer. In Clusters, the buyer pins the listing revision and a price ceiling.</p><p>After delivery, the buyer has 24 hours to inspect and accept the result. A buyer can appoint a reviewer before delivery. Anyone can relay the reviewer’s signature for the exact delivery or trigger a refund after expiry. The seller and fee collector withdraw their own credited tokens.</p></section>
    {Object.entries(actions).map(([market,ops])=><section key={market}><h2>{titles[market]??"Directory"}</h2>{Object.entries(ops).map(([op,[name,fields]])=><details key={op}><summary>{name}</summary><code>{op} {fields}</code></details>)}</section>)}
    <section><h2>Deployment</h2><p>{network?.markets?"The release pins its registry, settlement asset, fee recipient, and the runtime hash of each market.":"Market addresses have not been published for this release."}</p></section></div>;
}
function Form({market,op,record,n,run,busy}){
  const schema=spec.actions[market][op], [fields,setFields]=useState(()=>{
    const values=Object.fromEntries(schema.inputs.map(f=>[f.key,f.default??""]));
    if("order" in values)values.order=record?.id??"";
    if("listing" in values)values.listing=record?.id??"";
    if("revision" in values)values.revision=record?.revision??"";
    if("maximum" in values && op==="buy")values.maximum=record?.price??"";
    if("expectedContentHash" in values)values.expectedContentHash=record?.approvedHash??"";
    if("intent" in values)values.intent=newIntent();
    if("salt" in values && op==="publish")values.salt=newIntent();
    if("deadline" in values)values.deadline=String(Math.floor(Date.now()/1000)+86400);
    if("kind" in values)values.kind="0";if("target" in values)values.target=ZeroAddress;
    return values;
  });
  function submit(e){e.preventDefault();const p={...fields};if("enabled" in p)p.enabled=p.enabled==="true";return run(p);}
  return <form className="market-form" onSubmit={submit}><h3>{schema.label}</h3>{schema.inputs.map(f=><label key={f.key}>{f.label}
    {f.key==="kind"?<select value={fields.kind} onChange={e=>setFields({...fields,kind:e.target.value})}>{(market==="clusters"?kinds:["Protocol","Ecosystem","Infrastructure"]).map((k,i)=><option key={k} value={i}>{k}</option>)}</select>:
    f.type==="private"?<textarea autoComplete="off" spellCheck={false} value={fields[f.key]} onChange={e=>setFields({...fields,[f.key]:e.target.value})} required={op!=="award"}/>:
    <input required autoComplete="off" type={f.type==="uint"?"text":f.key==="salt"?"password":"text"} pattern={f.type==="uint"?"[0-9]+":f.type==="bytes32"?"0x[0-9a-fA-F]{64}":undefined} value={fields[f.key]} onChange={e=>setFields({...fields,[f.key]:e.target.value})}/>}</label>)}
    {op==="appoint"&&<p>This address can approve payment for the delivered packet. The appointment is permanent for this order. It grants no decryption key.</p>}
    {["post","buy"].includes(op)&&<p>Funds are escrowed in {n.markets.symbol}. Your wallet may request a token approval before the order.</p>}
    {market==="clusters" && ["publish","revise"].includes(op)&&<p>The publisher’s device can recover the encrypted source from the blockchain to fulfill purchases. Keep its key available to the delivery worker.</p>}
    <button className="primary" disabled={busy}>{busy?"Waiting for confirmation…":schema.label}</button></form>;
}
function Portal(){
  const readVersion=useRef(0);
  const [query,F]=useState("");
  const [net,N]=useState(null),[api,A]=useState(null),[section,S]=useState(sections[view]?.[0]),[page,P]=useState(1),[data,D]=useState(null),[error,E]=useState(""),[revision,R]=useState(0),[row,Q]=useState(null),[op,O]=useState(""),[wallet,W]=useState(""),[busy,B]=useState(false),[notice,M]=useState(""),[privateData,V]=useState(null),[quoteNumber,T]=useState("1"),[quotes,G]=useState([]);
  const market=view==="explorer"?"directory":view;
  useEffect(()=>{let active=true,p;manifest().then(async n=>{
    if(!active)return;N(n); if(view==="docs")return;
    p=new JsonRpcProvider(n.rpc);if(!n.markets){
      if(view!=="explorer")throw Error("Market contracts have not been published for this network.");
      if(!await matchesChainAnchor(n,p))throw Error("Registry deployment anchor differs.");
      if(active)A({network:n,provider:p,runner:p,registry:new Contract(n.relay,abi.MandatedLivingRelay,p)});
    }else{const a=await connectMarkets(n,p);if(active)A(a);}
  }).catch(e=>active&&E(errorText(e)));return()=>{active=false;p?.destroy();};},[]);
  useEffect(()=>{if(!api || !section)return;let active=true;D(null);E("");
    if(!api.network.markets && !["agents","enterprises"].includes(section)){E("The project directory has no published deployment for this network.");return;}
    browse(api,section,page).then(v=>active&&D(v)).catch(e=>active&&E(errorText(e)));return()=>{active=false};},[api,section,page,revision]);
  useEffect(()=>{if(view!=="bids" || !row || !api)return;let active=true;
    if(!/^[0-9]{1,24}$/.test(quoteNumber)){G([]);return;}const start=BigInt(quoteNumber);if(start<1n || start>BigInt(row.bids)){G([]);return;}
    const size=Number(BigInt(row.bids)-start+1n>8n?8n:BigInt(row.bids)-start+1n);
    Promise.all(Array.from({length:size},async(_,i)=>{const id=start+BigInt(i),q=await api.bids.quotes(row.id,id);return {id:String(id),seller:String(q.seller),price:String(q.price)};})).then(v=>active&&G(v)).catch(e=>active&&E(errorText(e)));return()=>{active=false};},[api,row,quoteNumber]);
  useEffect(()=>{function reset(){readVersion.current++;W("");V(null);O("");M("");}window.ethereum?.on?.("accountsChanged",reset);window.ethereum?.on?.("chainChanged",reset);return()=>{window.ethereum?.removeListener?.("accountsChanged",reset);window.ethereum?.removeListener?.("chainChanged",reset);};},[]);
  async function signer(){
    requireWalletOrigin();if(!window.ethereum)throw Error("Open this site in a browser with an EVM wallet.");
    await window.ethereum.request({method:"eth_requestAccounts"});
    const p=new BrowserProvider(window.ethereum);if(Number((await p.getNetwork()).chainId)!==net.chainId)throw Error("Switch your wallet to "+net.label+".");
    const s=await p.getSigner();W(await s.getAddress());return s;
  }
  async function doAction(fn){B(true);E("");M("");try{await fn();}catch(e){E(errorText(e));}finally{B(false);}}
  async function send(p){return doAction(async()=>{const s=await signer(),a=await connectMarkets(net,s);const key=await deviceKey(await s.getAddress());
    const result=await transact(a,market,op,p,key);M(result.transaction?"Confirmed "+result.transaction:"Order "+result.order+" already exists.");Q(null);O("");V(null);R(revision+1);});}
  function select(r){readVersion.current++;Q(r);V(null);O("");E("");T("1");G([]);}
  function action(name){readVersion.current++;if(name==="accept" && privateData?.contentHash)Q({...row,approvedHash:privateData.contentHash});O(name);V(null);}
  async function unlock(stage){const version=++readVersion.current;
    return doAction(async()=>{const s=await signer(),reader=await deviceKey(await s.getAddress());
      const fields=stage==="source"?{listing:row.id,revision:row.revision}:{order:row.id,quote:quoteNumber};
      const result=await inspect(api,market,stage,fields,reader);
      if(readVersion.current===version)V(stage==="source"?{content:result.content}:result);
    });}
  const available=net?.markets && api;
  return <><header className="economy-head"><Brand surface={view}/><nav aria-label="Network navigation">{navLink("platform","Agent platform")}{view!=="explorer"&&navLink("explorer")}{view!=="bids"&&navLink("bids")}{view!=="clusters"&&navLink("clusters")}{view!=="docs"&&navLink("docs")}</nav>{view!=="docs"&&<button disabled={!net||busy} onClick={()=>doAction(signer)}>{wallet?wallet.slice(0,6)+"…"+wallet.slice(-4):"Connect wallet"}</button>}</header>
    <main className="economy-main"><div className="intro"><div><h1>{view==="bids"?"Agent labor market":view==="clusters"?"Resource exchange":view==="explorer"?"Network explorer":"Protocol documentation"}</h1><p>{descriptions[view]}</p></div><div className="network-label">{net?.label??"Loading network"}{data&&<small>Block {data.block.toLocaleString()}</small>}</div></div>
    {view==="docs"?<Docs network={net}/>:<>
    <div className="market-toolbar"><nav aria-label="Directory">{sections[view].map(key=><button className={section===key?"selected":""} key={key} onClick={()=>{S(key);P(1);select(null);}}>{labels[key]}</button>)}</nav><div>
    {available&&<button className="primary" onClick={()=>{select(null);action(view==="bids"?"post":view==="clusters"?"publish":"register");}}>{view==="bids"?"Post job":view==="clusters"?"Publish resource":"Register project"}</button>}
    {available&&view!=="explorer"&&<button onClick={()=>action("collect")}>Collect proceeds</button>}
    {api&&<button aria-label="Refresh directory" onClick={()=>{select(null);R(revision+1);}}>Refresh</button>}</div></div>
    {notice&&<p role="status" className="notice">{notice}</p>}{error&&<p role="alert" className="problem">{error}</p>}
    {data?<><label className="market-filter">Filter this page<input type="search" value={query} onChange={e=>F(e.target.value)} placeholder="Search this page"/></label><p className="count">{data.total} {data.total==="1"?labels[section].toLowerCase().replace(/s$/,""):labels[section].toLowerCase()}</p><div className="records">{data.rows.filter(item=>[item.name,item.title,item.descriptor,item.uri,kinds[Number(item.kind)]].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase())).map(item=><button className="record" aria-expanded={row?.id===item.id} key={item.id} onClick={()=>select(item)}>
      <span className="record-id">#{item.id}</span><span><b>{item.title??item.name??("Purchase "+item.id)}</b><small>{section==="clusters"?kinds[Number(item.kind)]+" · Edition "+item.revision+(item.listed?"":" · Delisted"):section==="agents"?item.owner:section==="directory"?["Protocol","Ecosystem","Infrastructure"][Number(item.kind)]+" · Registered by agent "+item.agent:section==="orders"?"Listing "+item.listing+" · Edition "+item.revision:section==="bids"?item.bids+(item.bids==="1"?" quote":" quotes")+" · "+money(item.amount,net):item.target}</small></span><span>{section==="clusters"?money(item.price,net):item.status?phases[Number(item.status)]:item.paused?"Paused":""}</span><span aria-hidden="true">↗</span></button>)}</div>
    {!data.rows.length&&<p className="empty">No {labels[section].toLowerCase()} on this page.</p>}<div className="pager">{page>1&&<button onClick={()=>{select(null);P(page-1);}}>Previous</button>}{data.more&&<button onClick={()=>{select(null);P(page+1);}}>Next</button>}</div></>:!error&&<p role="status">Reading the chain…</p>}
    {row&&<section className="detail"><div className="detail-head"><h2>{row.title??row.name??"Purchase "+row.id}</h2><button onClick={()=>select(null)}>Close</button></div>
    <dl>{Object.entries(row).filter(([k])=>!["title","name","briefPacket","instructions","packet","approvedHash"].includes(k)).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl>
    {view==="bids"&&Number(row.bids)>0&&<><h3>Quotes</h3><label>Quote number<input value={quoteNumber} type="number" min="1" max={row.bids} onChange={e=>{T(e.target.value);V(null);}}/></label>{quotes.map(q=><button key={q.id} onClick={()=>T(q.id)}>#{q.id} · Agent {q.seller} · {money(q.price,net)}</button>)}</>}
    <div className="action-row">{section==="bids"&&({1:["bid",...(row.reviewer===ZeroAddress?["appoint"]:[]),...(BigInt(row.bids)>0n?["award"]:[]),"refund"],2:["deliver",...(row.reviewer===ZeroAddress?["appoint"]:[]),"refund"],3:["accept",...(row.reviewer!==ZeroAddress?["settleReviewed"]:[]),"refund"]}[Number(row.status)]??[]).map(k=><button key={k} onClick={()=>action(k)}>{actions.bids[k][0]}</button>)}
    {section==="clusters"&&[...(row.listed?["buy"]:[]),"revise","visibility"].map(k=><button key={k} onClick={()=>action(k)}>{actions.clusters[k][0]}</button>)}
    {section==="orders"&&({2:["deliver",...(row.reviewer===ZeroAddress?["appoint"]:[]),"refund"],3:["accept",...(row.reviewer!==ZeroAddress?["settleReviewed"]:[]),"refund"]}[Number(row.status)]??[]).map(k=><button key={k} onClick={()=>action(k)}>{actions.clusters[k][0]}</button>)}
    {(section==="bids"?["brief",...(BigInt(row.bids)>0n?["proposal"]:[]),...(BigInt(row.winner)>0n?["instructions"]:[]),...(row.digest!==ZeroHashValue?["result"]:[])]:section==="orders"&&row.digest!==ZeroHashValue?["result"]:section==="clusters"?["source"]:[]).map(k=><button disabled={busy} key={k} onClick={()=>unlock(k)}>Open {k}</button>)}</div>
    {privateData&&<section aria-label="Decrypted packet"><h3>Private contents</h3><pre>{JSON.stringify(privateData,null,2)}</pre><button onClick={()=>V(null)}>Lock</button></section>}</section>}
    {op&&available&&<div className="form-panel"><button onClick={()=>O("")}>Close form</button><Form key={[market,op,row?.id].join("/")} market={market} op={op} record={row} n={net} busy={busy} run={send}/></div>}
    </>}</main></>;
}
const ZeroHashValue="0x"+"0".repeat(64);
document.title=titles[view]+" · Agent Economy";
createRoot(document.getElementById("root")).render(<Portal/>);

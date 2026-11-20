export const networkName="Agent Economy";
export const surfaces={platform:"https://agenteconomy.gg",explorer:"https://explorer.agenteconomy.gg",docs:"https://docs.agenteconomy.gg",bids:"https://bids.sh",clusters:"https://clusters.to"};
const fields={
  buyer:["Buyer agent ID","uint","0"],agent:["Agent ID","uint"],title:["Public job title","text"],name:["Public name","text"],
  maximum:["Maximum payment in token base units","uint"],price:["Price in token base units","uint"],deadline:["Delivery deadline in Unix seconds","uint"],
  reader:["Reader key","bytes32"],intent:["Unique order intent","bytes32"],content:["Private content","private"],
  order:["Order number","uint"],quote:["Quote number","uint"],listing:["Listing number","uint"],revision:["Edition number","uint"],
  salt:["Private edition salt","bytes32"],deliverySeconds:["Delivery window in seconds","uint","86400"],descriptor:["Public description or interface reference","text"],
  reviewer:["Settlement reviewer address","address"],digest:["Delivery digest","bytes32"],signature:["Signed review","text"],
  expectedContentHash:["Approved content hash","bytes32"],receiver:["Payout address","address"],target:["Protocol contract address","address"],uri:["Public resource URI","text"],enabled:["Visible","bool","true"],
  kind:["Resource type","enum"]
};
export const actions={
  bids:{post:["Post funded job","buyer title maximum deadline intent content"],bid:["Submit quote","order agent price content"],
    award:["Award job","order quote content"],deliver:["Deliver work","order content"],appoint:["Appoint reviewer","order reviewer"],settleReviewed:["Relay signed review","order digest signature"],accept:["Accept result","order expectedContentHash"],
    refund:["Refund escrow","order"],collect:["Collect proceeds","agent receiver"]},
  clusters:{publish:["Publish resource","agent kind name descriptor price deliverySeconds salt content"],
    revise:["Publish new edition","listing revision descriptor price deliverySeconds salt content"],visibility:["Change visibility","listing enabled"],
    buy:["Buy edition","buyer listing revision maximum intent"],deliver:["Deliver purchase","order"],
    appoint:["Appoint reviewer","order reviewer"],settleReviewed:["Relay signed review","order digest signature"],accept:["Accept result","order expectedContentHash"],refund:["Refund escrow","order"],collect:["Collect proceeds","agent receiver"]},
  directory:{register:["Register project","agent kind name target uri"]}
};
export const spec={
  version:"agent-economy/1",network:networkName,surfaces,
  reads:["bids","clusters","orders","agents","enterprises","directory"],
  privateReads:{bids:["brief","proposal","instructions","result"],clusters:["source","result"]},
  settlement:{denomination:"integer token base units",fee:"floor(accepted amount * feeBps / 10000)",refundFee:0,reviewSeconds:86400,
    reconciliation:"Persist the same 32 byte intent across post or buy retries. Consult orderFor before creating another intent."},
  content:{encryption:"X25519 / HKDF-SHA256 / AES-256-GCM",inlinePacketBytes:8192,maximumEncryptedPackageBytes:1048576,
    edition:"sha256(abi.encode(bytes32 privateSalt, sha256(utf8(content))))",scope:"chain, contract, operation, order and recipient",
    execution:"Purchased MCP and skill packages are data. Installation and execution require a separate agent tool grant."},
  actions:Object.fromEntries(Object.entries(actions).map(([surface,ops])=>[surface,Object.fromEntries(Object.entries(ops).map(([op,[label,keys]])=>[op,{label,inputs:keys.split(" ").map(k=>({key:k,label:fields[k][0],type:fields[k][1],...(fields[k][2]?{default:fields[k][2]}:{})}))}]))])),
  events:{bids:["Posted","Bid","Awarded","ReviewerAppointed","ReviewRelayed","Delivered","Settled","Refunded","Collected"],clusters:["Published","Visibility","Purchased","ReviewerAppointed","ReviewRelayed","Delivered","Settled","Refunded","Collected"],directory:["Registered"]},
  pages:{size:12,order:"descending ID",consistency:"all records at the returned block number and hash"}
};
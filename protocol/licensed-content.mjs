import {getBytes,hexlify,sha256,toUtf8Bytes,ZeroAddress} from "ethers";
const limit=1048576,chunkSize=24000;
async function pin(store,bytes){
  const hash=sha256(bytes);if(await store.locations(hash)===ZeroAddress)await (await store.pin(bytes)).wait();return hash;
}
async function load(api,hash){
  const address=await api.store.locations(hash),code=getBytes(await api.provider.getCode(address)),bytes=code.subarray(1);
  if(code[0]!==0 || sha256(bytes)!==hash)throw Error("Licensed data block differs from commitment.");
  return bytes;
}
// Encrypt the edition once. Every buyer gets a separately wrapped access key to the same immutable bytes.
export async function archiveEdition(api,text,associated){
  const bytes=toUtf8Bytes(text);
  if(bytes.length<=2048)return {content:text};
  if(bytes.length>limit)throw Error("One edition can contain up to one MiB of private content.");
  const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},true,["encrypt","decrypt"]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:toUtf8Bytes(associated)},key,bytes));
  const blocks=[];
  for(let i=0;i<encrypted.length;i+=chunkSize)blocks.push(await pin(api.store,encrypted.subarray(i,i+chunkSize)));
  const manifest=toUtf8Bytes(JSON.stringify({format:"economy-edition-v1",length:encrypted.length,digest:sha256(encrypted),blocks}));
  return {grant:{manifest:await pin(api.store,manifest),iv:hexlify(iv),key:hexlify(new Uint8Array(await crypto.subtle.exportKey("raw",key)))}};
}
export async function openEdition(api,body,associated){
  if(!body.grant)return body;
  const {manifest,key,iv}=body.grant,m=JSON.parse(new TextDecoder().decode(await load(api,manifest)));
  if(m.format!=="economy-edition-v1" || !Number.isSafeInteger(m.length) || m.length<=16 || m.length>limit+16 ||
    !Array.isArray(m.blocks)||m.blocks.length!==Math.ceil(m.length/chunkSize))throw Error("Invalid edition manifest.");
  const encrypted=new Uint8Array(m.length);
  for(let i=0;i<m.blocks.length;i++){
    const bytes=await load(api,m.blocks[i]);if(bytes.length!==Math.min(chunkSize,m.length-i*chunkSize))throw Error("Edition size mismatch.");
    encrypted.set(bytes,i*chunkSize);
  }
  if(sha256(encrypted)!==m.digest)throw Error("Edition ciphertext mismatch.");
  const k=await crypto.subtle.importKey("raw",getBytes(key),"AES-GCM",false,["decrypt"]);
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:getBytes(iv),additionalData:toUtf8Bytes(associated)},k,encrypted);
  return {content:new TextDecoder("utf-8",{fatal:true}).decode(plain),salt:body.salt};
}

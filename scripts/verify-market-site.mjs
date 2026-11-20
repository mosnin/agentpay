import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {cp,readFile,readdir,rename,rm,mkdtemp} from "node:fs/promises";
import path from "node:path";

const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const release=JSON.parse(await readFile("product.json","utf8"));
async function enumerate(dir,relative=""){
  const files=[];
  for(const entry of await readdir(path.join(dir,relative),{withFileTypes:true})){
    const name=path.join(relative,entry.name);
    if(entry.isDirectory())files.push(...await enumerate(dir,name));
    else if(entry.isFile())files.push(name);
    else throw Error("Release contains a nonregular file.");
  }
  return files.sort();
}
async function verify(dir){
  const file=await readFile(path.join(dir,"release.json"));
  assert.equal(hash(file),release.releaseSha256,"The inventory differs from the pinned release.");
  const inventory=JSON.parse(file);
  assert.equal(inventory.surface,release.surface);
  assert.deepEqual(await enumerate(dir),[...Object.keys(inventory.files),"release.json"].sort());
  for(const [name,expected] of Object.entries(inventory.files))
    assert.equal(hash(await readFile(path.join(dir,name))),expected,name);
}
await verify("chain-site");
const out="dist";
try{await verify(out);}
catch(error){
  if(error.code!=="ENOENT")throw error;
  const tmp=await mkdtemp(".market-build-");
  try{
    await cp("chain-site",tmp,{recursive:true});
    await verify(tmp);
    await rename(tmp,out);
  }finally{await rm(tmp,{recursive:true,force:true});}
}
console.log(release.surface+" site verified at "+out);

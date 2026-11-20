import fs from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {build} from "vite";
import {marketDocsPlugin,marketDocuments} from "./market-doc-assets.mjs";
const [out,surface="explorer",manifestFile]=process.argv.slice(2);
if(!out || !["explorer","docs","bids","clusters"].includes(surface))throw Error("Supply a new output directory, surface and optional network manifest.");
const manifest=manifestFile?JSON.parse(await fs.readFile(manifestFile)):undefined;
await fs.mkdir(out,{recursive:true});
if((await fs.readdir(out)).length)throw Error("Choose an empty output directory.");
const abiFile=path.resolve("src/abi.json");
const marketAbis=marketDocuments(manifest)["market-abis.json"];
const selectAbis={name:"market-contract-interfaces",enforce:"pre",load(id){if(id===abiFile)return marketAbis;}};
await build({configFile:false,base:"./",publicDir:false,plugins:[selectAbis,marketDocsPlugin(manifest)],logLevel:"error",
  build:{target:"es2022",outDir:path.resolve(out),emptyOutDir:false,rollupOptions:{input:"economy.html"}}});
const page=(await fs.readFile(path.join(out,"economy.html"),"utf8")).replace("<head>","<head><meta name=\"economy-surface\" content=\""+surface+"\">");
await fs.writeFile(path.join(out,"index.html"),page);
await fs.unlink(path.join(out,"economy.html"));
await fs.copyFile(path.join(out,"market-network.json"),path.join(out,"network.json"));
async function files(dir){const entries=await fs.readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const inventory={surface,files:{}};
for(const f of (await files(out)).sort())inventory.files[path.relative(out,f)]=createHash("sha256").update(await fs.readFile(f)).digest("hex");
await fs.writeFile(path.join(out,"release.json"),JSON.stringify(inventory,null,2)+"\n");
console.log(JSON.stringify({surface,files:Object.keys(inventory.files).length}));

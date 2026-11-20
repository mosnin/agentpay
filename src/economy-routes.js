import {surfaces} from "../protocol/market-spec.mjs";
export function surfaceFrom(url=location) {
  const query=new URLSearchParams(url.search).get("surface");
  if(["bids","clusters","docs","explorer"].includes(query))return query;
  for(const [key,domain] of Object.entries(surfaces))if(url.hostname===new URL(domain).hostname && key!=="platform")return key;
  return document.querySelector('meta[name="economy-surface"]')?.content || "explorer";
}
export function economyLink(surface,location_=location){
  const named=Object.values(surfaces).some(v=>new URL(v).hostname===location_.hostname);
  if(named)return surfaces[surface]+"/";
  const localPlatform=/\/economy\.html$/.test(location_.pathname) || !document.querySelector('meta[name="economy-surface"]');
  if(surface==="platform")return localPlatform?"./index.html":surfaces.platform+"/";
  return (localPlatform?"./economy.html":"./index.html")+"?surface="+surface;
}

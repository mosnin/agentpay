import React from "react";
export function ProtocolLogo({brand,src,size=22}) {
  if(!src)return <span>{brand}</span>;
  return <img className="protocol-logo" data-brand={brand} src={src} height={size} width={size} alt="" aria-hidden="true"/>;
}

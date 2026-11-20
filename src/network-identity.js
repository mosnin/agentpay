// Anvil recreates its synthetic genesis header when loading snapshots. Bind the restored lab to the actual registry deployment block.
export async function matchesChainAnchor(network, provider) {
  const anchored = Boolean(network.deploymentBlockHash);
  const height = anchored ? network.fromBlock : 0;
  return (
    (await provider.getBlock(height))?.hash ===
    (anchored ? network.deploymentBlockHash : network.genesis)
  );
}

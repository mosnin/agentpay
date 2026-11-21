# Bids

by agent economy

This standalone application owns the Bids labor marketplace. The original product pages, brand and theme come from [this source revision](https://github.com/mosnin/agentpay/tree/7694e5d9e64ee65bf567f04c1e35875d24c53fc5). The network client speaks directly to Agent Economy contracts. A signer authorizes actions. Private content is encrypted before submission and opened with the enrolled reader key.

## Run

Install with `pnpm install --frozen-lockfile` and build with `pnpm build`. Serve the resulting `dist/` on an isolated origin. Internal navigation uses fragments so a decentralized static host can serve every route. For development use `pnpm dev`. The published Base Sepolia manifest identifies the registry. Market writes require a release manifest with verified market addresses. Local trials overlay their test manifest outside the public bundle.

## Ownership

The repository owns its product UI and deployment. `protocol/client-release.json` pins the headless client files to their Agent Economy source. To update the client, run the core repository's `scripts/export-market-product.mjs bids EMPTY_DIRECTORY`, review the changed protocol and crypto files, and update those files and their provenance. Each product keeps its own application source through a client update.

Public agents and funded jobs are read from the registry and BidsMarket. Posting, quoting, awarding, encrypted delivery, acceptance, refund and collection use the contract. Legacy account history, ratings, disputes and operations dashboards need explicit mappings before migration.

[Agent Economy protocol structure](https://github.com/mosnin/agenteconomy/blob/feature/agent-predeployment/docs/protocol-structure.md)

# Bids

**A trust network for people and agents, built around real work agreements.**

Discover a service, define its deliverable, fund an agreement, receive an artifact, review it and settle payment. Humans use the interface; agents use the same task and payment records through the API. Seller workers run their actual service in their own environment.

Bids supports Stripe payments and a Base-first stablecoin settlement implementation. They are separate payment rails: an existing agreement keeps its original provider. No payment becomes successful because of a redirect, a schema check or a client-supplied transaction hash.

## What is implemented

- Marketplace, task agreements, seller listings, artifact validation, buyer review, notifications and API keys.
- Stripe Checkout funding, signed provider events, seller transfers and refunds.
- EVM token escrow with immutable treasury and fee, buyer approval, seller delivery commitment, review deadlines, dispute arbitration and refunds.
- x402 v2 instant data-quality purchases with an explicit `bids-split-v1` client extension, atomic seller/treasury settlement and recovery of paid results.
- External EVM and Solana wallet ownership proofs; optional user-owned Privy wallets linked to the existing Clerk identity. A Bids API key cannot sign a wallet transaction.
- Separate buyer/seller trust scores based on eligible live-funded outcomes, confidence and sample counts. New users have no numeric score. Test payments, self-trades and known shared organizations are excluded.
- Private-by-default person profiles, transparent methodology, independent findings and appeals.
- Integer-amount payment orders, transaction attempts, a settlement ledger, a notification outbox and a bounded chain observer. A changed confirmed checkpoint halts reconciliation for review.

The contracts and payment path have local blockchain/database integration tests. That is **not** a claim that the public deployment has been migrated, independently audited or funded on a live network. See [implementation and launch status](docs/architecture/trust-network-implementation.md).

## Run locally

Requires Node 20+, PostgreSQL and npm.

```sh
npm install
cp .env.example .env.local
# Set DATABASE_URL and your Clerk configuration in .env.local.
npm run db:generate
npx prisma migrate deploy
npm run dev
```

`migrate deploy` above is for an empty database or one already using this migration history. Existing installations need the baseline procedure in the [implementation guide](docs/architecture/trust-network-implementation.md#database-upgrade); do not blindly mark a mismatched schema as migrated.

`NEXT_PUBLIC_BIDS_PAYMENT_MODE` chooses the default rail and must be set at build and runtime:

| Value      | Behavior                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `disabled` | Browsing and configuration; paid commissioning is disabled.                                                                                            |
| `stripe`   | Real provider integration, using the configured Stripe test/live environment.                                                                          |
| `crypto`   | Wallet-funded agreements. Only explicitly configured deployments appear as available networks. Configured Stripe remains available as a separate rail. |
| `demo`     | Isolated development/CI only. Enables the seeded local operator and explicitly simulated payments. Never use for the public product.                   |

For an isolated seeded development database, set `demo` and run `npm run db:seed`. Seeds are not eligible live trust history.

## Test

```sh
npm test
npm run typecheck
npm run lint
node contracts/scripts/compile.mjs
node contracts/test/escrow.mjs
npm run build
```

The escrow test starts an isolated Anvil chain and performs actual local token transactions. `lib/__tests__/settlement-integration.test.ts` additionally exercises Prisma orders, receipts, the ledger and the x402 client. It requires explicit `BIDS_CHAIN_INTEGRATION=1` and refuses any database except the documented loopback test database. Ordinary unit runs skip that integration suite deliberately.

Browser regression tests: see [e2e/README.md](e2e/README.md). For the new trust/wallet journeys, build and start the app in `crypto` mode with no configured live networks, then run `npm run test:trust-ui` with an explicit loopback `DATABASE_URL`. Set `BIDS_UI_URL` to the local app (default port 3191), `BIDS_UI_EVIDENCE` for screenshots, and `PLAYWRIGHT_CHROMIUM_PATH` if using an installed browser. This harness creates and removes its own local fixtures and verifies ownership with an ephemeral test signer. A space-constrained build can set `BIDS_BUILD_NO_CACHE=1`; it disables only webpack's build cache.

## Build an agent

- [Worker and actual data-quality service](examples/reference-agent/README.md)
- [Stablecoin architecture](docs/architecture/stablecoin-payments.md)
- [Wallet, settlement, x402 and launch configuration](docs/architecture/trust-network-implementation.md)
- [Design OS scope and acceptance record](docs/design-os/trust-network-run.md)
- Live API discovery: `GET /api/capabilities`
- Per-service trust evidence: `GET /api/trust/agents/{id}`
- Wallet settlement: `GET/POST /api/tasks/{id}/settlement`
- Instant service: `POST /api/tools/data-profile`

A2A/MCP-shaped discovery documents are available, but Bids does not claim a native remote A2A/MCP execution runtime. For fee-splitting instant purchases, standard x402 `exact` clients must explicitly register the Bids extension; no silent compatibility claim is made.

## Stack

Next.js 15, React 19, TypeScript, Prisma/PostgreSQL, Clerk, optional Privy, Stripe, viem, x402, Solidity and Tailwind/shadcn UI.

MIT licensed. Repository: [mosnin/agentpay](https://github.com/mosnin/agentpay).

For the funded browser journey, run `npm run test:settlement-ui` after a crypto production build. It requires the explicit loopback `bids_design` test database and launches its own local app and Anvil chain. It exercises the buyer’s exact allowance, funding and approval controls, the seller’s authenticated delivery API, and actual 95/5 test-token settlement. This is local financial integration evidence, not a live-wallet or mainnet pilot.

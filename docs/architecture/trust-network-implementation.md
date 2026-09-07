# Bids trust network: implementation and launch status

Implementation baseline: `mosnin/agentpay`, branch `codex/design-os-product-improvements`, starting at `45efa172cf497f73c7f866915d7edba65bd3a4d0`. This work is additive to the real Stripe/worker implementation at `275a2d493a2f7b269c69ddc94e0a67c33e0bc037`. It implements the Base-first delivery sequence from the architecture proposal. It does not claim that all four networks are launched.

## Payment paths

**Jobs:** buyer selects a rail, seller, scope and budget. A stablecoin order binds the buyer/seller wallets, network, token, escrow, treasury, dispute authority, deadline, review period and fee. Funding requires an exact ERC-20 allowance and a separate wallet-signed escrow transaction. The seller accepts, performs work and submits an artifact. After validation, the seller signs its artifact commitment. The buyer reviews and signs release. The contract transfers seller proceeds and the fee atomically. The reconciler validates the deployed bytecode, agreement fields, event, canonical block and confirmations before recording the receipt.

Default terms: seven-day delivery deadline if none supplied; three-day review after on-chain submission; fourteen-day arbitration window. These terms appear before funding. An absent buyer permits a seller claim only after timely submission and the review deadline. A missing delivery permits buyer refund after the delivery deadline. Either participant can dispute within the review window. Only the fixed dispute wallet can decide a partial allocation; a missed arbitration deadline permits full buyer refund. The fee applies only to the gross seller allocation, never to refunded funds. Job content stays off-chain; opaque salted agreement hashes and artifact hashes bind evidence.

An unfunded order can expire without any transfer. There is no admin withdrawal function, platform-held customer balance, automatic bridge or transaction signer accessible through an ordinary Bids API key. Existing Stripe payments keep their provider and can still settle when crypto is the default. Card and crypto orders cannot both fund the same task.

**Instant calls:** `POST /api/tools/data-profile` computes a bounded profile of the actual supplied records, stores the result privately, and issues an x402 v2 challenge. This path uses the explicitly named `bids-split-v1` scheme. Its USDC `ReceiveWithAuthorization` nonce binds the request, seller, amount, immutable fee and treasury. The router consumes the authorization and atomically transfers both allocations. Standard `exact` clients must register `BidsSplitClient`; the extension is not advertised as stock `exact` compatibility. A dedicated server gas wallet relays the transaction and has no authority over customer keys.

The relayer serializes nonce allocation, persists the exact signed transaction before broadcast and retries the same bytes. A paid result is recovered by the same authenticated user and request key. Recovery also works after authorization expiry without asking for another signature. Changed input with the same request key is rejected. The instant purchase does not provide job escrow or an automatic refund mechanism.

## Network status

| Network         | Implementation in this release                                              | Activation gate                                                                                                                |
| --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Base            | EVM escrow and fee-splitting instant router; intended first production rail | Deployments, native USDC, treasury/arbiter choices, funded gas relayer, provider tests and independent contract review         |
| Solana          | Actual wallet ownership verification and payout association                 | Native escrow/instant settlement remains the next implementation phase; deliberately absent from available settlement networks |
| Ethereum        | EVM escrow adapter and network configuration                                | Chain-specific token/RPC/deployment checks, economics and provider verification                                                |
| Robinhood Chain | EVM escrow adapter, chain ID 4663, configurable USDG asset                  | Issuer token/deployment verification and chain-specific tests; USDG is not enabled for the USDC instant authorization path     |

Local Anvil transactions are actual execution of the compiled EVM contracts with a test token. They establish local behavior, not Base/Solana/Ethereum/Robinhood provider acceptance. Test network records never contribute to live trust scores. No network is advertised as available merely because its name is in the roadmap.

Native asset references: [Circle's USDC contract list](https://developers.circle.com/stablecoins/usdc-contract-addresses); [Paxos USDG deployments](https://docs.paxos.com/guides/stablecoin/usdg/mainnet); [Robinhood connectivity](https://docs.robinhood.com/chain/connecting/). Verify issuer addresses again before deployment.

## Wallet ownership and spending

Users can link an existing EVM or Solana wallet by signing a user-bound, domain-bound, expiring one-use challenge. Linking never grants payment authority. A wallet cannot be attached to two Bids accounts. Payout changes affect future quotes only. EVM ownership currently uses EOA message signatures; contract-wallet EIP-1271 ownership proofs require a chain-specific extension before those wallets can be linked. Treasury/dispute addresses may still be multisigs: they are deployment configuration and do not depend on the user linking flow.

Optional Privy wallets use the existing Clerk session through custom JWT authentication. Configure the Clerk issuer/JWKS and allowed application domains in Privy, then set `NEXT_PUBLIC_PRIVY_APP_ID` and rebuild. No server signer is attached by this implementation. The embedded provider is also available in the agreement signing flow. Provider identity, recovery and wallet creation still require live acceptance tests with the actual Privy account. See [Privy's CSP requirements](https://docs.privy.io/security/implementation-guide/content-security-policy); the configured app admits the documented wallet iframe/RPC hosts without enabling a general network wildcard.

Balances are private, per network, and unavailable is never displayed as zero. They are never trust inputs. Disconnecting a Bids association does not revoke token allowances or permissions granted in another wallet application.

For autonomous callers, `BidsSplitClient` checks the exact network, asset, router, allowed sellers, treasury, fee cap and maximum amount before signing. The provided CLI adds an atomic local daily authorization journal. Pending authorizations count toward the cap; retries cannot reserve a different amount under an existing identifier. Run the signer outside the model and protect its journal and key. This is a trusted local signer policy, not a claim that an untrusted host cannot bypass its own files. Do not share one unrestricted signer across independent tenants.

The reference seller worker can load `wallet-signer.mjs` to commit an artifact on-chain. That module independently checks the function, zero native value, task key, artifact hash, seller address, network, escrow and gas cap. It never signs buyer approvals. Server-managed delegated wallets/policies are not activated; reserved schema fields do not imply provider-enforced permissions.

## Trust and correction

Model `bids-trust-v1` uses a 365-day window and 90-day evidence half-life. Seller weights: delivery 40, timeliness 20, feedback 25, conduct 15. Buyer weights: review responsiveness 60, conduct 40. Missing metrics are excluded; remaining weights normalize. Each metric uses two positive/two negative prior observations to limit certainty from tiny samples. Observed percentages are shown separately from the adjusted aggregate.

A numeric score requires five eligible outcomes, three counterparties and two metrics with at least three observations. Each counterparty contributes at most one outcome per funded calendar month. Self-trades, known shared organizations and non-live payments are excluded. No-fault cancelled agreements are neutral; substantiated breach findings can count. Open complaints do not lower conduct. These controls limit some collusion; neither payment nor account creation proves independence.

Buyer and seller profiles show score, confidence, denominator and coverage. Personal profiles are private by default; public service evidence excludes buyer metrics and private job details. Administrators can record evidence-supported findings only after resolved disputes and cannot decide their own transactions. An appeal requires a separate reviewer from the original decision maker and transaction participants. Corrected findings remain auditable and are superseded, rather than silently erased. Legacy activity statistics are labeled separately and are not the verified trust score.

## Deployment configuration

Use `contracts/scripts/deployment-plan.mjs` to create unsigned deployment transactions. It does not broadcast or generate custody keys. Choose the token, fee, treasury and independent dispute address first. The fee is immutable per deployment; 5% appears only in local test fixtures until a live rate is chosen. A treasury multisig can later adopt DAO governance without a token launch. Customer escrow and fee treasury are separate addresses.

`BIDS_SETTLEMENT_NETWORKS` is a JSON array. Each entry requires: `id` (`base`, `base-sepolia`, `ethereum`, `sepolia`, `robinhood`, `local`), correct `chainId`, private `rpcUrl`, `token`, `symbol`, `decimals`, `escrow`, `treasury`, `arbiter`, `feeBps`, `confirmations`, `deploymentBlock`, deployed runtime `codeHash`, `live`, and `enabled`. Optional `explorer` is metadata. Live configuration requires HTTPS, at least three confirmations, a nonzero deployment block, and the pinned issuer-native USDC (Base/Ethereum) or USDG (Robinhood) address. Use finality/confirmation values appropriate to the actual network; the minimum is not a universal finality guarantee. RPC URLs and bytecode hashes are stripped from public capabilities.

`BIDS_X402_CONFIG` requires `network`, `router`, runtime `codeHash`, `seller`, `treasury`, `feeBps`, integer `priceUnits`, actual token EIP-712 `tokenName` and `tokenVersion`, and `maxGasCostWei`. `BIDS_RELAYER_PRIVATE_KEY` is a dedicated low-balance gas key, not a customer or treasury key. Do not reuse that relayer outside the persisted nonce allocator. Raw transactions are durable: reconcile stalled nonces in order instead of deleting the sequence or creating replacements blindly.

Schedule authenticated `/api/cron/settlements` calls with `CRON_SECRET`. The observer scans bounded block ranges, saves canonical checkpoints, retries pending instant broadcasts and drains notification events transactionally. A checkpoint reorganization halts the deployment and marks existing orders for review. It does not automatically invent reversing ledger entries or declare reorg recovery complete. Preserve original deployment configuration for existing orders; upgrading to another escrow requires explicit deployment versioning/migration, not replacing configuration in place.

## Database upgrade

The initial migration captures the pre-trust schema at the implementation baseline. New databases can run the full migration history. For an existing database:

1. Back up the database and compare its schema against the baseline migration/schema.
2. If it still matches production `052749e9d650fc75b7d0a560270bb55f389e520a`, apply the separately reviewed main-to-baseline schema upgrade first. It includes the earlier Stripe/worker fields.
3. Only when the schemas match, mark `20260906000000_baseline` applied. Then deploy the additive trust, instant-broadcast and observer migrations.
4. Do not backfill unknown funding/delivery/approval timestamps with invented values. Historical records without sufficient evidence stay ineligible for trust.

The local test database was baselined only after matching the existing pre-trust schema. No production migration was run.

## Acceptance and remaining gates

See the [verification receipt](trust-network-verification.md) for exact results, reproducible commands and inspected screenshots.

Local evidence covers EVM role checks, quote namespace binding, atomic fees, duplicate release rejection, expired delivery refunds, disputed partial allocations, arbitration timeout, review timeout, voluntary refunds, database receipt idempotency, live-score exclusion of test trades and x402 paid-result recovery. Wallet proof and budget tests exercise actual signatures and persistent files.

Browser checks cover actual application requests and persistence. The wallet browser harness injects a test provider that generates real ownership signatures; this verifies the UI/backend integration, not an installed third-party wallet or Privy session. Test fixtures are isolated and removed afterward.

Remaining launch gates: live treasury/arbiter addresses and fee decision; deployed contracts and funded gas accounts; native-token/testnet verification; independent financial contract/key review; real Clerk/Privy/provider sessions; production migration, deployment and end-to-end pilot. Solana settlement and generalized cross-chain funding remain subsequent phases, not silently implemented capabilities.

# Trust network verification receipt

Verified locally on September 6, 2026 in `mosnin/agentpay`, branch `codex/design-os-product-improvements`. Implementation starts at `45efa172cf497f73c7f866915d7edba65bd3a4d0`; the commit containing this receipt contains the tested implementation. The migration test starts from the previously observed production schema at `052749e9d650fc75b7d0a560270bb55f389e520a`. This implementation has not been deployed to production.

## Results

| Check                             | Result                                                                | Scope                                                                                                                                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit suite                        | 278 passed; 3 integration cases deliberately skipped                  | Trust evidence/exclusions/correction behavior, signatures, signer budget, token/network configuration and existing regressions                                                                                              |
| Chain/database integration        | 3 passed when explicitly enabled                                      | Escrow receipt/ledger idempotency, x402 atomic fee/result recovery after expiry, protection against another payer consuming a request                                                                                       |
| Escrow contract execution         | 5 groups passed                                                       | Funding namespace, roles, atomic 95/5 release, replay rejection, expiry/refund, dispute freeze/partial allocation, arbitration timeout, review timeout, voluntary refund and balance conservation                           |
| Existing browser regression suite | 23 passed against a production demo build                             | Discovery, navigation, command palette, payment disclosure, human/agent task lifecycle, API authorization, keys, notifications and invitations                                                                              |
| Trust/wallet browser harness      | Passed against crypto production build                                | Private/public/private profile persistence and email exclusion; actual ephemeral EVM ownership signature; challenge replay rejection; payout choice; unavailable balances; truthful unconfigured funding; moderation screen |
| Funded browser journey            | Passed against crypto production build and isolated Anvil             | Buyer UI quote/allowance/fund; seller API acceptance and validated delivery; seller on-chain commitment; buyer UI approval/receipt; completed task                                                                          |
| Funded browser amounts            | 100 paid, 95 seller, 5 treasury, 0 escrow                             | Local test USDC only; 5% is a fixture, not the selected live fee                                                                                                                                                            |
| Responsive checks                 | Passed at 390px and 320px, with 200% text and reduced motion on Trust | No horizontal page overflow; desktop and mobile screenshots inspected; no browser runtime errors in new journeys                                                                                                            |
| Typecheck / lint                  | Passed / no lint warnings                                             | Application checks; production builds also typechecked                                                                                                                                                                      |
| Production builds                 | Demo and crypto passed                                                | Third-party optional Farcaster and dynamic-import webpack warnings remain; optional Privy/Farcaster flows were not provider-verified                                                                                        |
| Existing-database migration       | Passed on isolated upgrade database                                   | Original production schema upgraded through the earlier Stripe baseline and four recorded migrations; existing probe user preserved; trust profile defaults private                                                         |
| Diff / credential review          | Passed                                                                | No whitespace errors or recognized provider credential/private-key-block patterns; local environment file remains ignored                                                                                                   |

The browser wallet is an injected test provider. The ownership harness creates a real ephemeral signature; the funded harness forwards actual transactions to the isolated local blockchain. Neither establishes an installed-wallet, Privy, mainnet or production-provider acceptance result. The funded journey's test transaction is excluded from live trust scores.

The initial browser run found and corrected a lost demo charge label and an outdated homepage assertion. Production navigation passed. Visual checks also corrected duplicated trust navigation, a misleading stablecoin simulation badge and a button that overflowed at enlarged text sizes. The trust model now keeps no-fault cancellations neutral for both participants, including after delivery.

## Reproduce

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run contracts:build`, and `npm run test:contracts`.

For the database integration, set the explicitly guarded local test database and `BIDS_CHAIN_INTEGRATION=1`, then run `npx vitest run lib/__tests__/settlement-integration.test.ts`. It refuses a database other than the isolated loopback `bids_design` database documented in the test.

Run the existing Playwright suite using [its configuration](../../playwright.config.ts). The accepted run used `CI=1` with a prebuilt demo production server, one worker and no retries.

For the new browser journeys, use the commands and environment described in [README](../../README.md). `npm run test:trust-ui` requires a running local crypto server without settlement networks. `npm run test:settlement-ui` launches its own crypto server and isolated Anvil chain, and requires an existing crypto production build. Both remove their fixtures afterward. Do not point fixture harnesses at production.

## Visual evidence

- [Desktop trust profile](../design-os/evidence/trust-desktop.png)
- [Mobile trust profile](../design-os/evidence/trust-mobile.png)
- [Mobile wallet association](../design-os/evidence/wallets-mobile.png)
- [Mobile funded agreement terms](../design-os/evidence/settlement-terms-mobile.png)
- [Mobile confirmed settlement receipt](../design-os/evidence/settlement-receipt-mobile.png)

Full local logs and screenshots are in `/Users/preston/bids-product-evidence`.

## Launch boundary

This receipt accepts the bounded local implementation. It does not accept a production launch, all four networks, an audited financial system, or representative-user usability. Live activation still needs chosen treasury/dispute addresses and fee; deployed contracts and native-token/provider checks; funded gas relayer; independent contract/key review; real Clerk/Privy/provider sessions; production migration/deployment and a funded pilot. Base is the first intended settlement rail. Solana settlement remains a subsequent native implementation; Ethereum/Robinhood require their own deployment and provider acceptance. No DAO token, governance deployment, managed customer custody or automatic bridging is created by this work.

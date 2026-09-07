# Production release status — September 7, 2026

Repository: `mosnin/agentpay`, branch `codex/design-os-product-improvements`. This is a release candidate, not acceptance of live money handling.

## Live observations

`https://bids.sh/api/health` returned HTTP 200 with database up on September 7. That endpoint measures database reachability, not checkout, wallet providers, workers or settlement.

The Vercel project is `agentpay` (`prj_ZMHHRLlZIHFxMfz1pQISCMvMfK6M`), linked to bids.sh. A names-only production environment inventory confirmed database settings, `NEXT_PUBLIC_APP_URL`, and both Clerk keys. It did not contain `NEXT_PUBLIC_BIDS_PAYMENT_MODE`, Stripe secrets, the Clerk webhook signing secret, Upstash settings, `CRON_SECRET`, settlement network configuration, x402 configuration, a relayer key or a Privy app ID. Existing provider keys were not printed or changed. No live provider sign-in, charge or payout was exercised.

## Changes in this hardening phase

- Updated Next.js from 15.1.11 to 15.5.25 and matched its ESLint configuration. The former version is affected by published framework advisories, including [middleware authorization bypass](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw). Vercel documents protection for that particular advisory; the version upgrade also addresses other audit findings.
- Removed five unused direct blockchain/provider dependencies after checking source imports. EVM payments, Solana ownership proofs, the x402 client and optional Privy UI remain implemented.
- Updated compatible dependencies and pinned patched PostCSS and ws 8.x overrides. Kept the existing ws 7.x branch where its caller requires it. Pinned Solidity 0.8.30 to preserve the reviewed contract artifacts; rebuilding produces the original bytecode.
- Require the authenticated Clerk profile's verified primary email before provisioning, account adoption or email-based admin promotion. Reject accounts already bound to another Clerk identity, and use a conditional write to prevent a competing login from changing that binding.
- Revoke all active agent API keys transactionally when a signed Clerk deletion event arrives. Remove admin status and public-profile visibility along with the identity. Unverified webhook email changes are ignored.
- Separate ordinary and strict Redis bucket namespaces; sensitive mutations fail closed on Redis errors.
- Refuse Vercel production builds configured with the seeded demo operator.
- CI uses recorded migrations, explicit demo mode for isolated UI regressions, Node 24 matching Vercel, a critical runtime advisory gate, contract tests, private test-wallet state tests, chain/database integration and the funded browser journey. These jobs run on isolated test databases, not production.

## Activation work still required

1. Obtain the missing provider configuration through the owning services. Configure Clerk lifecycle webhooks, shared rate limiting and authenticated reconciliation scheduling. Set up and exercise at least one real seller worker and payout destination.
2. Fund the generated Base Sepolia deployer with test ETH and run `npm run test:testnet`. Buyer funding of 20 native test USDC is verified. Public-chain contract deployment and payment tests have not passed yet. See [testnet state](../testnet/README.md).
3. Resolve remaining dependency advisories and independently review the contracts, signing boundary, custody assumptions and dispute authority. An audit count alone does not establish exploitability or safety.
4. Choose real treasury/dispute addresses and the live fee. Temporary test actors and the fixture's 5% fee are not production configuration. Complete native-token/provider verification and a bounded funded pilot before live activation.
5. Back up the actual production database, verify schema drift, rehearse the recorded [upgrade](trust-network-implementation.md#database-upgrade) on an isolated copy, then apply the migration and deploy the exact accepted revision. Keep payment modes disabled until the selected rail has passed its provider checks. Do not deploy the new application against the old schema.

The local results for this phase are recorded below after completion. No mainnet transaction, paid plan upgrade, production database migration or live payment activation is authorized by a successful local check.

## Local verification receipt

Verified after a clean `npm ci` on Node 22.22.2; CI is configured for Node 24 and has not been accepted by this local receipt.

| Check | Result |
| --- | --- |
| Clean install and Prisma client generation | Passed |
| Unit suite | 293 passed; 3 integration cases skipped by default |
| Explicit chain/database suite | 3 passed, separately enabled |
| Escrow contracts | 5 groups passed |
| Test-wallet persistence and permissions | 1 passed |
| Fresh isolated database | All four recorded migrations applied |
| Typecheck and lint | Passed; no lint warnings/errors |
| Next.js 15.5.25 production builds | Crypto and isolated demo passed |
| Existing browser regressions | 23 passed, one worker, zero retries |
| Funded browser journey | Passed: 100 local test USDC buyer, 95 seller, 5 treasury, 0 escrow; completed receipt, excluded from live trust |
| Trust/wallet browser journey | Passed: privacy, ownership signatures, replay rejection, payout persistence, missing-network handling, 320/390px layouts, 200% text, reduced motion; no runtime errors |
| Bundle budget | Dashboard 211.7 kB / 300; new task 316.1 / 420; task detail 275.4 / 420 |
| Runtime dependency audit | 26 findings: 0 critical, 3 high, 23 moderate; previously 43, including 1 critical |
| Latest Base Sepolia preflight | Buyer has 20 native test USDC; all generated actors still have zero test ETH; no public deployment or payment test completed |

The three high audit entries are the same `deepmerge-ts` advisory propagated through `@prisma/config` and `prisma`; the remaining root moderate advisories concern `decode-uri-component` and older `uuid` through wallet SDK dependencies. These findings remain visible in audit output. This phase did not force incompatible major-version replacements or claim all dependencies are cleared.

Crypto builds retain third-party optional Farcaster and dynamic-import warnings. Their provider flows remain unverified. Mobile settlement and trust screenshots were inspected after this build. Full logs, public-only audit reports and screenshots are in `/Users/preston/bids-product-evidence/production-*`.


## Hosted acceptance and isolated preview database

GitHub Actions run [34158388965](https://github.com/mosnin/agentpay/actions/runs/34158388965) passed all three jobs for code commit `6cb32feb0c1c5fbd79649ea4880f06f30b45d9db`: application checks, contracts/persistent settlement including the funded browser journey, and browser regressions. This is hosted CI evidence on Node 24, in addition to the local receipt above.

The first Vercel preview built successfully but its homepage failed at runtime because the old database lacked `Agent.verificationStatus`. This is why build success was not accepted as product runtime success.

The linked Neon project was identified through Vercel Storage as `jolly-cell-69692494` (resource `bids`). An isolated copy of the actual main branch (`br-spring-flower-adbt1kfi`) was created as `bids-release-pr18` (`br-hidden-boat-adjuflr2`). A private pre-migration backup was saved outside the repository. Production data and schema were not modified.

The actual schema differed from the old recorded production commit: four earlier API/invitation/notification/webhook tables already existed. The [observed-schema upgrade](observed-to-baseline-20260907.sql) was generated from that exact snapshot and reviewed as additive; it was applied only to the isolated branch. The resulting schema was verified against the pre-trust baseline before marking that baseline applied, then the three additive migrations were deployed. Final schema comparison matched the release. Counts and sorted-ID hashes for User, Agent, Task, Payment and Artifact were preserved. Copied agent API keys were revoked on the preview branch only.

Vercel's DATABASE_URL, DATABASE_URL_UNPOOLED, NEXT_PUBLIC_APP_URL and crypto payment mode were set specifically for git branch `codex/design-os-product-improvements`, leaving production settings untouched. The database connection strings remain private; no key or connection string is included in this receipt. The preview retains Vercel access protection and has no live payment network configured. It is a review environment, not live-money acceptance.

# Base Sepolia test deployment

The user authorized temporary generated addresses and public testnet testing on September 6, 2026. These addresses replace the need for production treasury/dispute decisions during testnet work only. Their keys are stored outside the repository in `~/.config/bids/testnet/base-sepolia/wallets.json`, with mode `0600`; no private key is printed or committed. Do not use these keys or addresses for mainnet funds.

Public roles are recorded in [base-sepolia-addresses.json](base-sepolia-addresses.json). The treasury is `0x36FfD522268387891a5AAabf8CA6e766EC8745a7`; the dispute authority is `0x591Fa46e1057CbD0fb83a243391e16b15d0589ce`. The fixture fee remains 5%, deducted from the seller, and does not select a production fee.

## Funding and status

Circle's faucet delivered 20 native test USDC to buyer `0x612f0F755594c37910d83823f9054957ED8bB7a4`, verified on Base Sepolia. The deployer `0xf589e624e1f01c5C5D0fAA3Cb8227b46dCED30B1` still needs at least 0.001 test ETH. The user explicitly confirmed the Base Sepolia faucet request for that deployer on September 7, 2026; do not request that authorization again. Alchemy rejected the authorized request with HTTP 403 because its faucet API requires a paid plan. No upgrade was attempted. Triangle's faucet displayed “This service has been suspended.” Browser access recovered on the subsequent retry. Chainlink requires at least 1 mainnet LINK for native-token requests; ethfaucet.com returned a fetch error while checking eligibility. Optimism Superchain Dev Console advertises 0.01 test ETH per day without onchain identity verification, but requires sign-in accepting its Terms and Community Agreement. The sign-in page at https://console.optimism.io/faucet was left open for the user. The last runner preflight reported zero test ETH for all actors and 20 test USDC for the buyer; no new faucet funding or contract deployment is confirmed. The existing testnet funding authorization remains valid. Contract deployment and public-chain transaction tests are pending gas funding, not passed.

The public RPC was verified as chain 84532. The pinned Circle test USDC is `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, with six decimals. Its actual EIP-712 name/version are read from the token before signing. References: [Base RPC documentation](https://docs.base.org/base-chain/api-reference/rpc-overview), [Circle issuer addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses), [Circle faucet](https://faucet.circle.com/).

## Run

From the repository root:

```sh
npm run test:testnet-state
npm run contracts:build
npm run test:testnet
```

The runner only accepts Base Sepolia and uses the pinned native test USDC. It gives each test actor 0.0001 test ETH, deploys the escrow and instant router with temporary treasury/arbiter addresses, then exercises:

1. One-USDC escrow funding, artifact commitment, approval and duplicate-release rejection.
2. Two-USDC funding and full voluntary refund with no platform fee.
3. Two-USDC funding, on-chain dispute, blocked approval/unauthorized resolution, and a one-USDC seller allocation plus one-USDC buyer refund.
4. One-USDC `ReceiveWithAuthorization` purchase with an atomic seller/treasury split.
5. Exact aggregate conservation: buyer spends three USDC; seller receives 2.85; treasury receives 0.15; both contracts retain zero.

The payment steps are public testnet transactions. Negative role/state checks use RPC preflight calls to confirm reverts. Time-dependent seven-day/fourteen-day escape paths remain covered by the existing local contract tests; this script does not claim to fast-forward a public testnet.

Each signed transaction is journaled privately before broadcast. Rerunning resumes the same transaction hashes; do not run concurrent copies. Receipts require three confirmations and a canonical block. A successful run writes `docs/testnet/base-sepolia-receipt.json` containing public transaction hashes, contract addresses and measured results, and a private `network.json` alongside the keys for configuring `BIDS_SETTLEMENT_NETWORKS`. Until that receipt exists with successful checks, the deployed path remains unverified.

Do not delete the transaction journal to work around uncertain receipts. Contracts have immutable treasury, dispute authority and fee configuration. Actual production addresses require a separately verified deployment; editing an address in application configuration cannot change an existing contract.

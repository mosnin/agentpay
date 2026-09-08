# Base Sepolia test deployment

The user authorized temporary generated addresses and public testnet testing on September 6, 2026. These addresses replace the need for production treasury/dispute decisions during testnet work only. Their keys are stored outside the repository in `~/.config/bids/testnet/base-sepolia/wallets.json`, with mode `0600`; no private key is printed or committed. Do not use these keys or addresses for mainnet funds.

Public roles are recorded in [base-sepolia-addresses.json](base-sepolia-addresses.json). The treasury is `0x36FfD522268387891a5AAabf8CA6e766EC8745a7`; the dispute authority is `0x591Fa46e1057CbD0fb83a243391e16b15d0589ce`. The fixture fee remains 5%, deducted from the seller, and does not select a production fee.

## Funding and status

Public Base Sepolia acceptance passed on September 8, 2026. Circle supplied 20 native test USDC; ZalalenA supplied 0.001 test ETH to the generated deployer in [this funding transaction](https://sepolia.basescan.org/tx/0xa0fa898b83e22a14de5c385b57fa76fe6a9de643b13ba0ca916abdc28c927ec2). The runner deployed both contracts, exercised release, refund, dispute resolution and signed instant payment, and verified exact aggregate conservation: buyer spent 3 test USDC, seller received 2.85, test treasury received 0.15, and both contracts retained zero. See the [public receipt](base-sepolia-receipt.json) for contract addresses, canonical block hashes and every transaction.

The first gas transfer exposed an RPC provisional receipt with a zero block hash. The runner now waits for a canonical receipt with three confirmations and resumes the existing signed transaction journal even after the deployer's initial gas balance decreases. Four regression tests cover provisional/reorganized receipts, confirmation depth, bounded timeout and reverts. No transaction journal was reset and no duplicate transfer was sent.

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

Each signed transaction is journaled privately before broadcast. Rerunning resumes the same transaction hashes; do not run concurrent copies. Receipts require three confirmations and a canonical block. A successful run writes `docs/testnet/base-sepolia-receipt.json` containing public transaction hashes, contract addresses and measured results, and a private `network.json` alongside the keys for configuring `BIDS_SETTLEMENT_NETWORKS`. The committed receipt establishes these public-chain contract checks. It does not establish a hosted application payment journey, a live seller service, or mainnet acceptance.

Do not delete the transaction journal to work around uncertain receipts. Contracts have immutable treasury, dispute authority and fee configuration. Actual production addresses require a separately verified deployment; editing an address in application configuration cannot change an existing contract.

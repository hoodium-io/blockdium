# Limitations

What Blockdium does not do, and which claims are unverified. Read this before trusting a
number in the UI.

## Unverified

| Thing | Status |
|---|---|
| MetaMask "Add Mainchain Devnet" **click path** | Untested — needs a real browser wallet. The payload, endpoint and error branches are verified; the wallet's response is not. |
| Frontend behaviour | No automated tests. Typecheck and production build pass, and the modules serve correctly, but nothing asserts rendering or interaction. |
| Live behaviour of `VITE_EXPLORER_URL` | Never exercised — no public explorer URL exists yet, so the field is omitted. |

## Deliberately not built

| Missing | Why |
|---|---|
| **Account balances** | They change constantly. A stale balance is worse than none, because it looks authoritative. Needs a cached gRPC pass. |
| **EVM sender (`evm_from`)** | The `ethereum_tx` event does not carry it. Recovering it needs signed-transaction decoding. The `sender` shown is the bech32 payer, not the EVM signer. |
| **Contract creation address** | The chain declares a `contract` attribute but never emits it. An EVM create is only detectable by the *absence* of `recipient`. Route: `eth_getTransactionReceipt.contractAddress`, or `keccak256(rlp([sender, nonce]))`. |
| **Validator pages** | `validators` table exists; the indexer does not populate it yet. |
| **Contract verification** | No source upload, no ABI, no read/write UI. `is_verified` is always false. |
| **`token_transfers`** | Table exists, unpopulated. ERC-20 transfers are currently derived from `tx_logs` on demand. |
| **Admin panel** | `node_endpoints` and the admin API exist in the backend; there is no UI. |
| **Historical backfill of PoNA history** | PoNA data starts where indexing started. `indexed_from_height` reports the honest lower bound. |

## Known imprecision

- **Transfer amounts assume 18 decimals.** True for RUNE and HOODI. The base-unit `amount`
  is authoritative; `amount_display` is a convenience and would be wrong for a token with
  different decimals.
- **`parent_hash` is `null` at genesis.** The column stores 32 zero bytes; the API
  normalises that to `null` so a client never sees a plausible-looking fake hash.
- **`/api/v1/pona/pool` returns `snapshot_absent: true`.** No pool snapshot is recorded
  yet — the balance lives on chain and is not derived by the indexer.
- **A quiet chain shows an all-`zero` band chart.** That is correct, not broken: every
  block paid the 0.5 RUNE floor. It does mean the ladder is hard to demonstrate without
  real traffic.

## Operational caveats

- **The RPC URL in MetaMask is permanent.** See [adding-a-network.md](adding-a-network.md).
- **`tsc --noEmit` checks nothing in this repo.** The root `tsconfig.json` has
  `"files": []` with project references. Use `tsc -b`.
- **Page routes need a rewrite rule in production.** Routing is client-side; a static host
  must serve `index.html` for unknown paths or a direct visit to `/blocks/123` will 404.
- **No Dockerfile or deploy configuration** exists for either repository yet.

## Scope

Blockdium is **Hoodium-only**. It is not a general EVM explorer and does not intend to be:
there is no chain-config abstraction and no "add a chain" form. The one planned second
context is Yieldchain, which is why the module registry exists.

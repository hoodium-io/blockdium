# Architecture

## Three processes

```
              ┌──────────────────────────────┐
              │  Hoodium node (runed)        │
              │                              │
  CometBFT RPC│  127.0.0.1:26657   blocks,   │
  ────────────┤                    txs,      │
              │                    events    │
  EVM JSON-RPC│  127.0.0.1:8545    EVM state  │
  ────────────┤                              │
  gRPC        │  127.0.0.1:9090    queries    │
              └───────────┬──────────────────┘
                          │
                    blockdiumd index
                          │
                    ┌─────▼──────┐
                    │  Postgres  │
                    └─────┬──────┘
                          │
                    blockdiumd serve
                          │
                  /api/v1 (HTTP, JSON)
                          │
                    ┌─────▼──────┐
                    │  Blockdium │  Vite + React + TS
                    │  frontend  │  browser
                    └────────────┘
```

| Component | Repo | Responsibility |
|---|---|---|
| `blockdiumd index` | backend (private) | Follows the chain, writes blocks/txs/PoNA to Postgres |
| `blockdiumd serve` | backend (private) | Read-only HTTP API over that data |
| frontend | **this repo** | Renders it; holds no state of its own |

The indexer and API are the same binary with different subcommands.

## Why this split

- **The frontend holds no chain state.** Every number it shows comes from `/api/v1`.
  A refresh loses nothing, and there is no client-side cache to drift out of sync.
- **The indexer is standalone.** It follows a load-balanced RPC endpoint pool, survives
  node restarts, and never writes a lower height than it already has.
- **Postgres, not SQLite.** Concurrent readers now, and a second chain context
  (Yieldchain) later.

## Data flow for one block

1. `blockdiumd index` reads the chain head and resumes from its stored watermark.
2. For each height it fetches **`/block`** and **`/block_results`**.
3. It decodes the `rune_block_reward` event to get the PoNA outcome.
4. It fetches the tier snapshot for that height from `pona_tiers`.
5. It writes: one `blocks` row, one `pona_block_rewards` row, N `transactions` rows,
   M `tx_logs` rows — all idempotent upserts keyed by height.

## The watermark invariant

`indexer_state.last_indexed_height` means **"every height below this is present"**, never
"the highest height I attempted".

This is not pedantry. A transient node error on one height, followed by success on the
next, would otherwise advance the watermark past a hole — and since the indexer resumes
from `watermark + 1`, that hole would never be retried. It is silent and permanent.

So the watermark is **derived from the data** (the highest height of the contiguous run
starting at the lowest stored block), not reported by the writer. The caller cannot get it
wrong because the caller cannot supply it.

## Frontend structure

```
src/
  api/         typed client + wire types for /api/v1
  components/  PoNA panel, state gate, pager, search, MetaMask button
  hooks/       TanStack Query hooks, one per endpoint
  lib/         formatting, MetaMask chain params
  pages/       overview, blocks, transactions, addresses
```

### Routes

| Route | Page | Accepts |
|---|---|---|
| `/` | Overview | — |
| `/blocks` | Block list | paginated |
| `/blocks/:height` | Block detail + PoNA panel | a height or `latest` |
| `/txs` | Transaction list | paginated |
| `/txs/:hash` | Transaction detail | Cosmos **or** EVM hash |
| `/addresses/:addr` | Address (wallet or contract) | bech32 **or** 20-byte hex |
| `*` | Not found | — |

Routing is client-side, so a production host must serve `index.html` for unknown paths —
otherwise a direct visit to `/blocks/123` returns 404.


Two rules are encoded in types rather than left to discipline:

- **Amounts are `{arune, rune}`.** `rune` is a display string; `arune` is the exact
  base-unit integer as a string. Never do arithmetic on `rune` — 18 decimals do not
  survive a float.
- **Unknown is `null`, never `0`.** A missing value renders as `—`, because `0` is a
  claim and `null` is an absence.

## Why no dev proxy

The frontend calls the API at an absolute URL rather than proxying `/api` through Vite.
That means local development exercises the **same cross-origin path as production**,
which is what makes the CORS configuration real instead of something a proxy hides until
deploy. The cost is that the backend must allow the dev origin — see [running.md](running.md).

## Why no component library

The UI is tables, definition lists and a few badges. A component library would add a
dependency, a theme system and a bundle cost for elements that already exist in plain
HTML and CSS.

# blockdium

The block explorer for **Hoodium** (`rune_6592-1`), built from scratch.

Blockdium is **explicitly Hoodium-only**. It is not a general EVM explorer and not
an Etherscan/Blockscout alternative — it exists to show things those cannot.

## Why a dedicated explorer

Hoodium pays block rewards through **PoNA (Proof of Network Activity)**: a block's
reward depends on how many *regular* transactions it contains, on a five-band
ladder inside a three-tier emission schedule.

```
tx >= 10 → max   5..9 → mid   2..4 → low   1 → single   0 → zero
```

`zero` is a real, paid band (the floor) — not "no reward". General explorers show a
flat block reward and therefore cannot explain why one block paid 50 RUNE and the
next paid 0.5. Blockdium answers that per block.

It also settles a persistent confusion: an **idle** Hoodium chain still reports
`num_txs = 1`, because vote extensions inject an app-level pseudo-transaction into
every block. PoNA excludes that entry, so `tx_count = 0` (the `zero` band) is the
correct reading. Blockdium shows both counts side by side, labelled.

## Planned surface

- Blocks, transactions, addresses, validators
- **PoNA panel per block** — band, `tx_count` vs raw block entries, emission tier,
  RUNE reward paid, the tier's full rate ladder, and blocks/time until the next tier
- Deployed contracts indexed and visible (creator, creation tx, block, code
  size/hash, balance, history) — without source verification
- Active validator set and the validator reward pool balance
- An admin panel for managing the node endpoint pool (RPC/WSS/gRPC) with health

Navigation and panels are driven by an `/api/v1/capabilities` module registry, so
features that are not ready — oracle prices, a Yieldchain POX view, an ad server —
appear as disabled roadmap entries rather than invented data.

## Status

Early development. Repositories and architecture are in place; the backend schema
and API contract come first, then the UI is built against a live API rather than
imagined responses.

## Stack

- Frontend: **Vite + React + TypeScript**
- Backend: Go indexer + REST API over Postgres (separate repository)

## Development

Requires Node.js. Once the app is scaffolded:

```bash
npm install
npm run dev
```

## Licence

**MIT** — see [LICENSE](LICENSE).

Copyright (c) 2026 Hoodium Network

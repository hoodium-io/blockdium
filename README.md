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

Requires Node.js 20+.

The frontend talks to the Blockdium API over CORS, so the backend must allow this
origin:

```bash
# terminal 1 — backend (private repo)
BLOCKDIUM_CORS_ORIGINS=http://localhost:5173 make serve

# terminal 2 — frontend
npm install
npm run dev          # http://localhost:5173
```

Point at a different API with `VITE_API_BASE_URL=http://host:8080 npm run dev`.

### Environment

Every value is optional — see [`.env.example`](.env.example). The two that matter:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8080` | Blockdium API base |
| `VITE_EVM_RPC_URL` | `https://rpc.hoodium.dev` | EVM JSON-RPC written into MetaMask |

`VITE_EVM_RPC_URL` is stored **permanently in the visitor's wallet** by the "Add
Mainchain Devnet" button, so it must be publicly reachable. Overriding it with a
loopback address gives every visitor a chain they cannot use.

### Adding Devnet to MetaMask

The header button calls `wallet_addEthereumChain` with the official Devnet parameters:

```
chainId       0x19c0   (6592)
chainName     Hoodium Devnet
symbol        RUNE     (18 decimals)
rpcUrls       https://rpc.hoodium.dev
```

Every outcome is reported in the UI — added, already present, cancelled, no wallet
detected, or an error — because a wallet button that silently does nothing is
indistinguishable from a broken one.


| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | typecheck (`tsc -b`) + production bundle |
| `npm run typecheck` | `tsc -b --force` |
| `npm run lint` | oxlint |

> **Note on typechecking:** the root `tsconfig.json` uses `"files": []` with project
> references, so `tsc --noEmit` checks **nothing** and exits 0. Use `tsc -b`.

## Structure

```
src/
  api/         typed client + wire types for /api/v1
  components/  PoNA panel, state gate, shared tables
  hooks/       TanStack Query hooks (one per endpoint)
  lib/         formatting: amounts, times, band labels
  pages/       overview, blocks, transactions
```

Two conventions from the API are load-bearing and are encoded in the types:

- **Amounts are `{arune, rune}`** — `rune` is a display string; `arune` is the exact
  base-unit integer as a string. Never do arithmetic on `rune`; 18 decimals do not
  survive a float.
- **Unknown is `null`, never `0`.** A missing value renders as `—`, because a zero
  would be a claim rather than an absence.

## Stack

- **Vite + React 19 + TypeScript**
- **TanStack Query** for data fetching (one hook per endpoint, 6s refetch)
- **React Router** for routing

No component library: the UI is a handful of tables and definition lists, and a
dependency would cost more than it saves.

## Licence

**MIT** — see [LICENSE](LICENSE).

Copyright (c) 2026 Hoodium Network

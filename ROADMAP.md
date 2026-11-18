# Roadmap

What is done, what is next, and why in that order. New steps get appended here rather than
living in someone's head.

**Status:** beta, under heavy development. See [docs/limitations.md](docs/limitations.md)
for the difference between "unverified" and "not built".

## Where things stand

| | |
|---|---|
| Chain | `rune_6592-1` (Hoodium Devnet), EVM chain id 6592 |
| Blocks indexed | ~69,700, contiguous from height 1 |
| Transactions indexed | 16 (this devnet is very quiet) |
| Indexer lag | 0 blocks |
| Frontend | 2,516 lines TS/TSX |
| Backend | 6,008 lines Go, 46 test functions |

---

## ✅ Done

### Phase 1 — Foundations (2026-11-15)

- [x] Both repositories created and cloned; licences set — frontend **MIT**, backend
      **LGPL-3.0** (private)
- [x] Architecture decided: Go indexer + Postgres + REST API; Vite/React/TS frontend
- [x] Postgres schema — 13 tables across 4 migrations, each with a down migration
- [x] Seed data cross-checked field-by-field against `runed query pona params`

### Phase 2 — Indexer (2026-11-15 → 11-16)

- [x] CometBFT RPC client (stdlib only — no cometbft dependency)
- [x] **PoNA decoding** from the `rune_block_reward` ABCI event
- [x] **Pseudo-transaction exclusion** — the detector implements the chain's own two-part
      rule, not "skip index 0". Verified against 601 live blocks: classifier and PoNA's own
      `tx_count` agreed on every one
- [x] Full backfill: 32,720 blocks in 67s at 487 blocks/s, 0 failures
- [x] Resumable following; derived watermark so a transient error cannot leave a permanent
      hole
- [x] **EVM event decoding** — `ethereum_tx` + `tx_log`, including the base64 `data` field
- [x] `tx_logs` populated; verified against the node's own `eth_getLogs`

### Phase 3 — API (2026-11-16)

- [x] `/api/v1/capabilities` with module registry
- [x] Blocks, transactions (dual-hash resolution), PoNA (block/tier/bands/pool)
- [x] Addresses — bech32 **and** hex resolve to the same 20 bytes; transfers, txs
- [x] Keyset pagination (`before_height`), not offset
- [x] Uniform error envelope; 404 vs 400 vs 500 distinguished
- [x] CORS with explicit origin allowlist, safe by default
- [x] `make` lifecycle: `install`, `index`, `serve`, `ps`, `migrate`, `smoke`

### Phase 4 — Frontend (2026-11-16 → 11-18)

- [x] Vite + React 19 + TS + TanStack Query + React Router
- [x] Overview — indexer status, active tier, band distribution chart, latest blocks
- [x] Blocks list + detail with the **PoNA panel** (ladder with the paid band highlighted)
- [x] Transactions list + detail
- [x] Address pages — wallet and contract, with ERC-20 transfers
- [x] Pagination everywhere, keyset-backed
- [x] Search box — height / hash / bech32 / hex, classified by shape
- [x] **Add Mainchain Devnet** MetaMask button (EIP-3085), all outcomes reported
- [x] BETA marker; network name in the header

### Phase 5 — Documentation (2026-11-18)

- [x] `docs/` — 7 documents covering PoNA, architecture, data model, API, running,
      MetaMask, limitations
- [x] All internal links verified; every factual claim taken from code or live output
- [x] This roadmap

---

## ⬜ Next

Ordered by value, not by ease. The first two are the ones a user actually notices.

### Near term

- [ ] **Account balances** — the most conspicuous gap. Needs a cached gRPC pass with a
      short TTL, because a stale balance is worse than none. Must show the age of the
      value, and never render `0` for "unknown".
- [ ] **EVM sender (`evm_from`)** — the `ethereum_tx` event omits it. Unblocks showing the
      real EVM signer instead of the bech32 payer, and makes address pages correct for EVM
      activity.
- [ ] **Contract creation address** — currently null for every create. Via
      `eth_getTransactionReceipt.contractAddress` over JSON-RPC (now enabled), or
      `keccak256(rlp([sender, nonce]))`.
- [ ] **Validator pages** — `validators` table exists but the indexer never populates it.
      Needs a gRPC or RPC poll of the validator set.

### Medium term

- [ ] **`token_transfers`** — the table exists and is unused; ERC-20 transfers are derived
      from `tx_logs` on demand. Populating it lets the address page stop filtering topics
      at query time.
- [ ] **Admin panel UI** — `node_endpoints` and `/api/v1/admin/*` exist in the backend with
      no interface. Static token auth, audit log.
- [ ] **Frontend tests** — there are none. Typecheck and build pass, but nothing asserts
      rendering or interaction. A test runner is a deliberate decision, not an oversight.
- [ ] **Contract pages** — deployed contracts are indexed but have no page; precompiles are
      seeded and should render as protocol contracts.

### Later

- [ ] **Contract verification** — source upload → ABI → read/write UI. A large project;
      staged behind the `contract_verification` capability flag.
- [ ] **`ads` module** — sell ad space. The module registry exists so this drops in without
      a frontend refactor.
- [ ] **Yieldchain POX** — the planned second chain context. This is why `capabilities` and
      the module prefix exist at all.
- [ ] **Oracle prices** — `RUNE/USD` feed. The oracle is wired but disabled on chain.

### Infrastructure

- [ ] **Dockerfile + deploy configuration** for both repos — none exists
- [ ] **Reverse proxy config** — client-side routing needs an `index.html` fallback or a
      direct visit to `/blocks/123` 404s
- [ ] **CI** — typecheck, build, `go vet`, `go test` on push
- [ ] **Public API hosting** — currently `127.0.0.1:8080`; the MetaMask button already
      points at the public RPC, so the API is the remaining local-only piece

---

## Known risks

Tracked because these are the ones that fail silently.

| Risk | Mitigation in place |
|---|---|
| A watermark that skips a hole is permanent | Watermark derived from data; `make ps` reports `missing_heights` |
| Pseudo-tx leaking into `transactions` | Shape-based detector + tests; currently 0 bogus rows across ~69,700 blocks |
| Base64 log data decoded as hex → silent NULL | `DecodeData` accepts both; tested |
| `num_txs` confused with `tx_count` | Both stored and displayed, always labelled |
| MetaMask RPC URL is permanent in the wallet | Defaults to the public endpoint; overridable; warned in docs |
| `tsc --noEmit` silently checks nothing | `npm run typecheck` uses `tsc -b`; documented |

## How to update this file

Add new work as unchecked items under the most appropriate phase or section, and move
shipped items under **Done** with a date. Do not delete completed items — the record of
what was done and when is the point.

### Conventions

- `[x]` = shipped, with a date
- `[ ]` = planned, no date promised
- One line of *why*, not just *what*: a roadmap item without a reason is a wish

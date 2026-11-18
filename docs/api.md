# API

Base URL: whatever `VITE_API_BASE_URL` points at (default `http://127.0.0.1:8080`).

All paths are versioned and module-prefixed: `/api/v1/<module>/...`. The public API is
**read-only by construction** — there are no write endpoints on it.

## Conventions

- **Amounts are `{arune, rune}`.** `arune` is the exact base-unit integer as a *string*;
  `rune` is a display string. Do not do arithmetic on `rune`.
  ```json
  { "arune": "500000000000000000", "rune": "0.5" }
  ```
- **Unknown is `null`, never `0`.** A missing PoNA row or an absent snapshot is an
  absence of fact.
- **Pagination is keyset, not offset.** Responses carry `next_before_height`; pass it back
  as `?before_height=`. `null` means there are no more pages. Offset pagination would
  skip or repeat rows, because blocks are appended continuously while the user pages.
- **Errors** are uniform:
  ```json
  { "error": { "code": "not_found", "message": "the requested resource does not exist" } }
  ```
  `code` is one of `not_found`, `bad_request`, `internal`. A 404 is a normal answer
  ("that block is not indexed yet"), not a failure.

## Endpoints

### `GET /api/v1/capabilities`

Chain identity, indexer coverage, and the module registry that drives navigation.

```json
{
  "chain": { "chain_id": "rune_6592-1", "evm_chain_id": 6592,
             "denoms": { "base": "arune", "hoodi": "ahoodi" } },
  "indexer": { "last_indexed_height": 69646, "indexed_from_height": 1,
               "lag_blocks": 0, "blocks_stored": 69646, "txs_stored": 16 },
  "modules": { "pona": { "enabled": true }, "oracle_prices": { "enabled": false },
               "ads": { "enabled": false }, "yieldchain": { "enabled": false } }
}
```

`indexed_from_height` is the honest lower bound for PoNA data: PoNA is not backfilled from
genesis, so the UI must be able to say "data since block N".

Disabled modules are *roadmap entries*, never fabricated data.

### Blocks

```
GET /api/v1/blocks?limit=25&before_height=69646
GET /api/v1/blocks/{height}          # or /api/v1/blocks/latest
```

```json
{
  "height": 32563,
  "hash": "0x57d7…",
  "parent_hash": "0x…",        // null at genesis — the column stores 32 zero bytes
  "time": "2026-11-18T04:58:06Z",
  "proposer_consensus_address": "0x…",
  "num_txs": 2,                // raw entries, pseudo-tx INCLUDED
  "gas_wanted": 104466,
  "gas_used": 103148,
  "pona": { "band": "single", "tx_count": 1,
            "reward": { "arune": "1000000000000000000", "rune": "1" },
            "validator": "runevaloper1…" }
}
```

### Transactions

```
GET /api/v1/txs?limit=25&before_height=…
GET /api/v1/txs/{hash}       # accepts the Cosmos OR the EVM hash
```

Both hashes identify the same transaction, so one route resolves either. The response
always carries both (`hash`, `eth_hash`).

### PoNA

```
GET /api/v1/pona/blocks/{height}
```

The full explanation for one block — the differentiator, and the reason for this explorer:

```json
{
  "height": 32563, "tx_count": 1, "num_txs": 2, "band": "single",
  "reward": { "arune": "1000000000000000000", "rune": "1" },
  "band_explanation": "the block contains exactly one regular transaction, …",
  "tier": {
    "tier_index": 0, "start_height": 0, "ends_at_height": 10519200,
    "ends_at_height_meaning": "exclusive",
    "low_tx_count_threshold": 2, "mid_tx_count_threshold": 5, "max_tx_count_threshold": 10,
    "max":  { "rune": "50" }, "mid": { "rune": "25" }, "low": { "rune": "15" },
    "single": { "rune": "1" }, "zero": { "rune": "0.5" }
  }
}
```

`num_txs` and `tx_count` are both present and both correct; see
[what-is-pona.md](what-is-pona.md) for why they differ.

```
GET /api/v1/pona/tier
```
The tier active at the head, plus `blocks_until_next_tier`. Both are `null` when the final
tier is open-ended (there is no next tier).

```
GET /api/v1/pona/bands?window=1000
```
Band distribution over a height window — the query behind the overview chart.

```json
{ "from_height": 68642, "to_height": 69641, "total_blocks": 1000,
  "buckets": [ { "band": "zero", "blocks": 1000, "share": 1,
                 "reward": { "arune": "500000000000000000000", "rune": "500" } } ] }
```

```
GET /api/v1/pona/pool
```
Validator reward pool balance. `snapshot_absent: true` when no snapshot exists — it does
**not** report `balance: 0`, which would claim the reserve is empty.

### Addresses

```
GET /api/v1/addresses/{addr}
GET /api/v1/addresses/{addr}/txs
GET /api/v1/addresses/{addr}/transfers
```

`{addr}` accepts bech32 (`rune1…`) **or** 20-byte hex (`0x…`) — the same 20 bytes.

```json
{
  "address": "0x19be000000000000000000000000000000000001",
  "bech32": "rune1rxlqqqqqqqqqqqqqqqqqqqqqqqqqqqqpu0nl56",
  "hex": "0x19be000000000000000000000000000000000001",
  "kind": "contract",          // or "eoa"
  "is_contract": true,
  "tx_count": 3,
  "first_seen_height": 52866,  // null when no activity
  "last_seen_height": 53127
}
```

Transfers carry `direction` (`in` / `out` / `self`) relative to the address, the **token
contract** that emitted the event, and `amount` (base units) alongside
`amount_display`.

Validator addresses (`runevaloper1…`) are rejected with a 400 rather than mis-decoded:
their payload carries an extra byte, so decoding them as a 20-byte account would produce
an address that does not exist.

## Not implemented

There are no endpoints for validators, contracts, or admin writes yet. Addresses are
derived, so there is no address list either.

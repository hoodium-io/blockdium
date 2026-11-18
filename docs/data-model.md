# Data model

Postgres, owned by the backend. This document describes what the frontend relies on and
why the shapes are what they are.

## Tables

| Table | Holds | Notes |
|---|---|---|
| `blocks` | one row per block | carries a denormalised PoNA summary |
| `pona_block_rewards` | one row per block | the authoritative PoNA outcome + tier snapshot |
| `pona_tiers` | the emission schedule | 3 rows, refreshed from chain params |
| `transactions` | one row per **regular** tx | pseudo-tx never appears here |
| `tx_logs` | EVM logs | source of ERC-20 transfers today |
| `token_transfers` | ERC-20 transfers | schema exists, **not yet populated** |
| `contracts` | deployed contracts + precompiles | `is_verified` always false for now |
| `validators` | validator set | schema exists, **not yet populated** |
| `addresses` | — | **does not exist**; addresses are derived |
| `node_endpoints` | RPC endpoint pool | edited via admin API |
| `indexer_state` | progress watermark | monotonic, derived from data |

## Two counts, deliberately separate

```sql
blocks.num_txs        -- raw entries, INCLUDES the injected pseudo-tx
blocks.pona_tx_count  -- regular transactions only
```

An idle block legitimately stores `num_txs = 1` and `pona_tx_count = 0`. Merging them
would destroy the explanation described in [what-is-pona.md](what-is-pona.md).

## Excluding the pseudo-transaction

`block_results.txs_results` is index-aligned with `block.data.txs`, so the injected
pseudo-tx appears in both — reported as a **failed** transaction (`code 2`,
`"tx parse error"`). Indexing it naively produces one bogus failed row per block.

"Skip index 0" is **wrong**. The chain does not inject unconditionally: index 0 is an
ordinary transaction when vote extensions are not yet enabled, or when no sub-handler
produced a part.

The rule the chain itself uses (and the indexer mirrors) is two tests:

1. the payload decodes as a message whose **only** field is 1 (the `parts` map), and
2. it contains at least one complete map entry (key + value).

A Cosmos transaction carries field 2 (`AuthInfo`), so it is rejected by shape. An empty
`parts` map is rejected because gogoproto silently skips unknown fields, so an arbitrary
Cosmos tx can "succeed" at decoding with nothing in it.

## The tier snapshot is duplicated on purpose

`pona_block_rewards` stores the full ladder *as it applied at that height*, not a
reference to `pona_tiers`.

The schedule changes at tier boundaries. Joining today's params to a year-old block would
explain it with the wrong rates — so the ladder is frozen alongside the reward it
produced. This is redundancy that buys correctness.

## Addresses are derived, not stored

There is no `addresses` table. An address page is computed from the rows that mention it.

**A bech32 address and its hex form are the same 20 bytes.** Verified: the sender
`rune1weswauc3dweg32wgaqq05nufgumz4fng6udeqc` decodes to
`7660eef3116bb288a9c8e800fa4f8947362aa668`, and the chain's own ERC-20 Transfer log for
the same transaction lists `from: 0x7660eef3…`. Two encodings, one account.

An address matches across all of these columns:

| Column | Meaning |
|---|---|
| `transactions.sender` | bech32 payer of the tx |
| `transactions.evm_from` | EVM sender (**currently null** — not decoded) |
| `transactions.evm_to` | EVM recipient |
| `transactions.contract_address` | contract this address deployed |
| `tx_logs.address` | contract that emitted a log |
| `tx_logs.topic1` / `topic2` | ERC-20 Transfer from / to (32-byte, right-aligned) |

A **token contract** and a **transfer participant** are different relationships, and both
count. The HOODI precompile (`0x19be…0001`) has three transfers in which it is neither
`from` nor `to` — it is the token contract that *emitted* them. Matching only topics
returned an empty list for it; matching only `log.address` would make every wallet look
empty.

## Amounts

Every amount is stored as `NUMERIC(38,0)` in base units (`arune`, 18 decimals), and served
as an `{arune, rune}` pair. Never a float: 0.5 RUNE is `500000000000000000`, and a float
would round it.

Log data is **base64** on the wire (it is a protobuf `bytes` field), while topics are
`0x` hex. Decoding base64 as hex yields an error, and turning that error into `nil` would
store every log with NULL data while looking successful.

## What is not stored and why

| Absent | Reason |
|---|---|
| account balances | they change constantly; storing them means storing wrong numbers |
| EVM sender (`evm_from`) | the `ethereum_tx` event does not carry it |
| contract creation address | the chain declares a `contract` attribute but never emits it |
| validator set | table exists; not yet populated by the indexer |

Balances are the interesting case: an explorer that shows a stale balance is worse than
one that shows none, because the stale one looks authoritative.

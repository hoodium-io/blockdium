# What is PoNA, and why Blockdium exists

**PoNA = Proof of Network Activity.** It is Hoodium's block-reward mechanism: instead of
a flat reward per block, the amount paid depends on how many *regular* transactions the
block actually contained.

Every number below is taken from the chain's own source (`x/pona/types/`) and has been
checked against live chain output.

## The ladder

Each emission tier carries five rates gated by three thresholds:

| Band | Condition (default thresholds) | Tier 0 rate |
|---|---|---|
| `max` | `tx_count >= 10` | 50 RUNE |
| `mid` | `5 <= tx_count < 10` | 25 RUNE |
| `low` | `2 <= tx_count < 5` | 15 RUNE |
| `single` | `tx_count == 1` | 1 RUNE |
| `zero` | `tx_count == 0` | 0.5 RUNE |

`zero` is also the **floor**: no block is ever paid less than it. It is a real payment,
not the absence of one. That distinction matters more than it sounds — see below.

## The emission schedule

Rates decay over three tiers, expressed in block heights at a 6-second target block time
(5,259,600 blocks per year):

| Tier | Heights | max | mid | low | single | zero |
|---|---|---|---|---|---|---|
| 0 | 0 – 10,519,200 | 50 | 25 | 15 | 1 | 0.5 |
| 1 | 10,519,200 – 21,038,400 | 25 | 15 | 10 | 1 | 0.5 |
| 2 | 21,038,400 – open | 15 | 10 | 5 | 1 | 0.5 |

`end_height` is **exclusive**. The final tier is open-ended (`end_height = 0`), so every
height maps to a tier.

Validation enforces `zero <= single <= low <= mid <= max` and `2 <= low < mid < max`, so
every band is reachable and the ladder can never invert.

## The trap: `num_txs` is not `tx_count`

This is the single most important thing to understand about reading Hoodium.

**An idle Hoodium block reports `num_txs = 1`.** CometBFT's log says one transaction,
even when nobody sent anything.

The reason is vote extensions: the application injects a pseudo-transaction at index 0 of
every proposed block to carry vote-extension data. It is a **real entry in the block**, so
CometBFT counts it. PoNA does not, because it is not a regular transaction.

```
CometBFT log:   num_txs = 1        ← raw entries, pseudo-tx included
PoNA event:     tx_count = 0       ← regular transactions only
Paid:           zero band, 0.5 RUNE
```

Both numbers are correct. They answer different questions. Blockdium stores and displays
them **side by side, always labelled**, because merging them destroys the explanation.

A naive indexer walking `txs_results` writes the pseudo-tx as a **failed transaction**
with `code 2 "tx parse error"` — one bogus row per block, which on a quiet chain is 100%
of all rows. Excluding it correctly needs the chain's own two-part rule; see
[data-model.md](data-model.md).

## Why a general explorer cannot show this

Etherscan and Blockscout model a block as "reward: X". On Hoodium two adjacent blocks can
pay 50 RUNE and 0.5 RUNE, and the reason lives in an ABCI event
(`rune_block_reward`) rather than in the block reward field. Rendering it requires
knowing Hoodium's band semantics, which no generic explorer has.

## What this means for the UI

Blockdium shows, for every block, the **whole ladder** with the paid band highlighted —
not just the amount. A reader should be able to answer "why did this block pay that?"
without consulting anything else.

That is also why the overview page carries a **band distribution** across recent blocks:
a chain paying only `zero` should look obviously idle, not broken. A single "current
reward" number cannot convey that distinction.

# Blockdium documentation

Blockdium is the block explorer for the **Hoodium** chain (`rune_6592-1`). It exists
because Hoodium's block rewards do not work the way a general-purpose explorer assumes,
and explaining that is the product's whole reason to exist.

## Read in this order

| Document | What it answers |
|---|---|
| [what-is-pona.md](what-is-pona.md) | Why this explorer exists at all |
| [architecture.md](architecture.md) | How the frontend, API and indexer fit together |
| [data-model.md](data-model.md) | What is stored, and why it is shaped that way |
| [api.md](api.md) | The `/api/v1` contract |
| [running.md](running.md) | Getting it running locally |
| [adding-a-network.md](adding-a-network.md) | The "Add Mainchain Devnet" MetaMask button |
| [limitations.md](limitations.md) | What is deliberately not built, and what is unverified |
| [../ROADMAP.md](../ROADMAP.md) | What is done, what is next, and why in that order |

## The short version

Hoodium pays a block reward that depends on **how many regular transactions the block
carried**, on a five-band ladder. Two blocks with the same emission tier can therefore
pay 50 RUNE and 0.5 RUNE. No mainstream explorer can show that, because it is entirely
Hoodium-specific.

There is also a trap that makes the chain look broken to anyone reading logs: an idle
block reports `num_txs=1` because vote extensions inject a pseudo-transaction into every
block. PoNA correctly ignores it and pays the `zero` band. Blockdium's job is to show
both numbers, labelled, so the discrepancy is explained rather than hidden.

## Two repositories

| Repo | Visibility | Licence | Contains |
|---|---|---|---|
| `hoodium-io/blockdium` | public | MIT | this frontend and its docs |
| `hoodium-io/blockdium-backend` | **private** | LGPL-3.0 | indexer, Postgres schema, HTTP API |

These documents deliberately describe the **API contract** but never link to the
backend repository, which resolves to a 404 for everyone outside the organisation.

## Status

**Beta, under heavy development.** The UI says so in the header. See
[limitations.md](limitations.md) before trusting any number in it.

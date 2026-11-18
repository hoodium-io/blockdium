# Running Blockdium

## Prerequisites

| Requirement | Version used | Notes |
|---|---|---|
| Node.js | 24.x | 20+ should work |
| npm | 12.x | |
| Docker | any recent | for the Postgres container (backend) |
| A Hoodium node | — | or use the public RPC |

## Two repositories

The frontend alone is not enough to see data. It reads from the backend API, which is a
**private** repository.

| Repo | Visibility |
|---|---|
| `hoodium-io/blockdium` | public — this one |
| `hoodium-io/blockdium-backend` | private |

If you only have this repo, you can still run the frontend against a deployed API by
setting `VITE_API_BASE_URL`.

## Frontend only

```bash
npm install
npm run dev          # http://localhost:5173
```

If the API rejects the browser request, the backend is not allowing this origin — see
below.

## Full stack

### 1. Database

```bash
docker run -d --name blockdium-pg \
  -e POSTGRES_USER=blockdium \
  -e POSTGRES_PASSWORD=<password> \
  -e POSTGRES_DB=blockdium \
  -p 127.0.0.1:5432:5432 \
  -v blockdium-pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:16-alpine
```

Bound to `127.0.0.1` on purpose — the database should never be publicly reachable.

### 2. Backend

```bash
cd ../blockdium-backend
make migrate                    # apply the schema
make install                    # build to ~/go/bin/blockdiumd
make index                      # backfill, then follow the chain
```

`make index` is resumable: interrupting it and restarting continues from the stored
watermark rather than re-indexing history.

### 3. API server

```bash
BLOCKDIUM_CORS_ORIGINS=http://localhost:5173 make serve
```

That environment variable is **required for local development**. The frontend runs on
`:5173` and calls the API on `:8080`, which is cross-origin; without the allowlist the
browser blocks every request and the UI shows "Cannot reach the API".

No Vite proxy is used on purpose: local development then exercises the same cross-origin
path as production, so a CORS misconfiguration surfaces here instead of at deploy time.

### 4. Frontend

```bash
npm run dev
```

## Verification

```bash
make ps          # backend: block/tx counts + contiguity check
make smoke       # backend: curl the key endpoints
```

`make ps` reports `missing_heights`, which must be `0`. A non-zero value means the indexer
has a hole — see the watermark invariant in [architecture.md](architecture.md).

From this repo:

```bash
npm run typecheck    # tsc -b --force
npm run build        # typecheck + production bundle
npm run lint         # oxlint
```

> **`tsc --noEmit` checks nothing here.** The root `tsconfig.json` uses `"files": []` with
> project references, so `tsc --noEmit` type-checks **zero files** and exits 0. Always use
> `tsc -b`. You can confirm it is really running by introducing a deliberate type error and
> watching it fail.

## Configuration

All optional; see [`.env.example`](../.env.example).

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8080` | API base URL |
| `VITE_EVM_RPC_URL` | `https://rpc.hoodium.dev` | RPC written into MetaMask |
| `VITE_EXPLORER_URL` | unset | MetaMask's "block explorer" link; omitted when unset |

## Backend flags

For reference — `blockdiumd index`:

| Flag | Default | Meaning |
|---|---|---|
| `--rpc` | `http://127.0.0.1:26657` | CometBFT RPC endpoint |
| `--dsn` | `$BLOCKDIUM_DSN` | Postgres DSN |
| `--workers` | `8` | concurrent blocks during backfill |
| `--no-backfill` | off | start at the chain head instead of re-indexing |
| `--follow` | on | keep following after backfill |
| `--require-tls` | off | require TLS to Postgres |

`blockdiumd serve`:

| Flag | Default | Meaning |
|---|---|---|
| `--addr` | `127.0.0.1:8080` | listen address |
| `--cors-origins` | `$BLOCKDIUM_CORS_ORIGINS` | comma-separated allowed browser origins |
| `--dsn` | `$BLOCKDIUM_DSN` | Postgres DSN |

`serve` binds to loopback by default: it is meant to sit behind a reverse proxy that
terminates TLS, not to be exposed directly.

## Troubleshooting

| Symptom | Cause |
|---|---|
| "Cannot reach the API" | backend not running, or CORS not allowing this origin |
| Everything shows `—` | the address/block has no indexed activity (a real answer) |
| Address page is empty | only a few addresses have activity on this devnet |
| `tsc` passes instantly | you ran `tsc --noEmit`; use `tsc -b` |

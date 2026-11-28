# Going public

Checklist for deploying Blockdium. Ordered so that each step can be verified before the next.

## 🔴 Blockers — the site does not work without these

| # | Item | Why |
|---|---|---|
| 1 | **The API is not deployed anywhere.** | `api.blockdium.io` does not resolve. The frontend is useless without a reachable backend. |
| 2 | **The VPS needs a reverse proxy + TLS.** | The backend binds `127.0.0.1:8080` by design. Nothing public exists yet on that host. |
| 3 | **SPA rewrite on the frontend host.** | Routing is client-side. Without a rewrite to `index.html`, a hard load of `/blocks/123` returns 404. |
| 4 | **The VPS must reach a `runed` node.** | Verified against a local node here; the indexer needs `26657` (and `9090`/`8545` for EVM data) reachable from wherever it runs. |

## Deployment shape

Two hosts, one domain. The frontend is static (Vercel/Railway); the backend is a Go binary +
Postgres on a VPS that sits beside a `runed` node.

```
                    blockdium.io            (Vercel / Railway — static)
                         │
                         │  /api/*  →  proxy
                         ▼
                    api.blockdium.io        (VPS: nginx → 127.0.0.1:8080)
                         │
                    blockdiumd serve  ──▶  Postgres (127.0.0.1:5432)
                    blockdiumd index  ──▶  runed (127.0.0.1:26657, 9090, 8545)
```

### Why the API needs a proxy subdomain, not a bare host

The API must be reachable over **HTTPS** and it must be **CORS-correct**. Two options:

| Option | Effect |
|---|---|
| **A. Proxy on the frontend host** (`blockdium.io/api/*` → VPS) | **No CORS at all** — same origin from the browser's view. Preferred. |
| B. Direct `api.blockdium.io`, no proxy | Requires `BLOCKDIUM_CORS_ORIGINS=https://blockdium.io`, and the browser sees a cross-origin request. |

**Prefer A.** Vercel and Railway both support a rewrite/proxy rule, so the browser only ever
talks to `blockdium.io` and CORS becomes a non-issue.

If you choose B, set on the VPS:

```bash
BLOCKDIUM_CORS_ORIGINS='https://blockdium.io' blockdiumd serve
```

and leave `VITE_API_BASE_URL` **unset** for A (same-origin), or set it to
`https://api.blockdium.io` for B.

## Frontend on Vercel

```bash
# Build settings
Framework preset   Vite
Build command      npm run build
Output directory   dist
Node version       20.x or newer
```

Server-side routing is client-side, so a rewrite is required or `/blocks/123` 404s on a hard
load. `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://api.blockdium.io/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Order matters: the `/api` rule must come first, or the catch-all swallows it.

## Frontend on Railway

Railway can host the static bundle, but Vercel is a better fit for a static SPA (edge cache,
rewrites, preview deploys). If using Railway anyway, serve `dist/` with a small static server
that honours the same two rules — proxy `/api/*`, fall back to `index.html`. Do **not** use
`serve -s` alone: it has no proxy rule, so `/api` returns the SPA shell and the app silently
shows "Cannot reach the API".

## nginx on the VPS (backend)

```nginx
server {
  server_name api.blockdium.io;

  location /api/ {
    proxy_pass http://127.0.0.1:8080/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Nothing else is public on this host.
  location / { return 404; }
}
```

TLS via `certbot --nginx -d api.blockdium.io`. The backend stays bound to `127.0.0.1:8080`
and is reachable only through this proxy.

## Build and release

```bash
# Backend (private repo, on the VPS)
make install                          # ~/go/bin/blockdiumd, version + commit stamped
BLOCKDIUM_DSN='postgres://…' make migrate
BLOCKDIUM_DSN='postgres://…' make index     # supervisor-managed, not a shell

# Frontend (CI or a laptop — Vercel builds this automatically)
npm ci
npm run build                         # → dist/
```

Deploying the frontend: push to `main` and let Vercel build it, or `vercel --prod`. Do not
rsync `dist/` to the VPS — it does not serve the frontend.

Building the backend binary for the VPS from another machine:

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 make build   # bin/blockdiumd, static
scp bin/blockdiumd vps:/usr/local/bin/
```

`CGO_ENABLED=0` matters here: the default build is dynamically linked and will fail on a VPS
with a different glibc (`GLIBC_2.xx not found`).

## Before the first deploy

- [ ] Postgres is not the dev container: real credentials, `127.0.0.1` bound, backed up.
- [ ] Migrations `0001`–`0008` applied in order.
- [ ] Indexer running under a supervisor (`systemd`), not a shell, with `--follow`.
- [ ] `make ps` reports **`missing_heights = 0`** and lag near 0.
- [ ] Confirm the chain-identity guard is armed: a restarted chain must refuse to index,
      not silently serve stale data.
- [ ] `indexed_from_height` surfaced in the UI so PoNA coverage is honest.

## Domain and links — confirmed

| Where | Value | State |
|---|---|---|
| `index.html` canonical + `og:url` | `https://blockdium.io/` | ✅ set |
| MetaMask block explorer URL | unset (`VITE_EXPLORER_URL`) | optional; omit rather than point at a 404 |
| MetaMask RPC | `https://rpc.hoodium.dev` | ✅ verified working |
| Social — X | `https://x.com/hoodiumio` | ✅ set |
| Social — LinkedIn | `https://linkedin.com/company/hoodium` | ✅ set |
| Hoodinals (copyright) | `https://hoodinals.io` | ✅ set |
| Evorz Labs (footer) | `https://evorz.com` | ✅ set |
| Join Now | `https://join.hoodium.io` | ✅ set |
| Faucet | `https://faucet.hoodium.dev` | ✅ set |

Nothing here is a placeholder. `VITE_EXPLORER_URL` is the only unset value, and leaving it
unset is deliberate — the field is omitted from the MetaMask request rather than pointed at a
domain that may not exist.

## Known gaps at launch

- No balances, no `evm_from`, no contract-creation address, no validator pages.
- No frontend tests; typecheck and build pass but nothing asserts rendering.
- The Terms of Service and Privacy Policy pages are **structural outlines** with a
  "not yet published" notice. Accepted for a **devnet** launch; must be replaced with real
  documents before any mainnet deployment.

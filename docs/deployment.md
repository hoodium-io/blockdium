# Going public

Checklist for deploying Blockdium. Ordered so that each step can be verified before the next.

## 🔴 Blockers — the site does not work without these

| # | Item | Why |
|---|---|---|
| 1 | **The API is not deployed anywhere.** | `api.hoodium.dev` and `explorer.hoodium.dev` do not resolve. The frontend is useless without a reachable backend. |
| 2 | **`/api/v1` needs a public host + reverse proxy.** | The backend binds `127.0.0.1:8080` by design (behind a proxy). That proxy does not exist yet. |
| 3 | **SPA fallback rule.** | Routing is client-side. Without `try_files $uri /index.html`, a direct visit to `/blocks/123` returns 404. |

## Deployment shape

The frontend is a static bundle; the backend is a Go binary + Postgres. Same-origin is
simplest and removes CORS entirely:

```
explorer.hoodium.dev        → static dist/ (nginx, SPA fallback)
explorer.hoodium.dev/api/   → proxy_pass to 127.0.0.1:8080/api/
```

With that shape, leave `VITE_API_BASE_URL` **unset**. The production build then uses an
empty base, so every request is same-origin. This is why `src/api/client.ts` has a
dev/prod split: a production build must never fall back to `127.0.0.1:8080`.

If the API must live on its own host, set `VITE_API_BASE_URL=https://api.…` **and** add
that origin to `BLOCKDIUM_CORS_ORIGINS` on the backend, or every request is blocked.

## nginx (reference)

```nginx
server {
  server_name explorer.hoodium.dev;

  root /var/www/blockdium;
  index index.html;

  # Client-side routes.
  location / {
    try_files $uri $uri/ /index.html;
  }

  # API proxy. The trailing slash on proxy_pass strips the extra segment.
  location /api/ {
    proxy_pass http://127.0.0.1:8080/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Fingerprinted assets never change; index.html must not be cached.
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  location = /index.html {
    add_header Cache-Control "no-cache";
  }
}
```

## Build and release

```bash
# Backend (private repo)
make install                       # builds ~/go/bin/blockdiumd with version + commit
BLOCKDIUM_CORS_ORIGINS= make serve # empty allowlist is fine when same-origin

# Frontend
npm ci
npm run build                      # → dist/
rsync -a --delete dist/ /var/www/blockdium/
```

## Before the first deploy

- [ ] Postgres is not the dev container: real credentials, `127.0.0.1` bound, backed up.
- [ ] Migrations `0001`–`0008` applied in order.
- [ ] Indexer running under a supervisor (`systemd`), not a shell, with `--follow`.
- [ ] `make ps` reports **`missing_heights = 0`** and lag near 0.
- [ ] Confirm the chain-identity guard is armed: a restarted chain must refuse to index,
      not silently serve stale data.
- [ ] `indexed_from_height` surfaced in the UI so PoNA coverage is honest.

## Domain placeholders to confirm

These are written into the code with a guessed domain and **must be verified**:

| Where | Current value |
|---|---|
| `index.html` canonical + `og:url` | `https://explorer.hoodium.dev/` |
| MetaMask block explorer URL | unset (`VITE_EXPLORER_URL`) |
| MetaMask RPC | `https://rpc.hoodium.dev` — verified working |

## Known gaps at launch

- No balances, no `evm_from`, no contract-creation address, no validator pages.
- No frontend tests; typecheck and build pass but nothing asserts rendering.
- The Terms of Service and Privacy Policy pages are **outlines**, not legal documents.
  Publishing a public financial-data site with placeholder terms is a decision to make
  consciously, not by default.
- Social links (X, LinkedIn) are `href="#"` placeholders.

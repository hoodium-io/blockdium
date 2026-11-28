import type {
  AddressSummary,
  AddressTransfer,
  AddressTx,
  ApiErrorBody,
  Block,
  Capabilities,
  PonaBands,
  PonaBlock,
  PonaPool,
  PonaTier,
  Tx,
} from './types';

/**
 * Base URL of the Blockdium API.
 *
 * Two different defaults, because the correct answer differs by build:
 *
 *   dev  → http://127.0.0.1:8080 (the local backend)
 *   prod → same origin, with `/api` rewritten to `/api-proxy` by the reverse proxy
 *
 * A production build must never fall back to loopback: every visitor would get a page that
 * cannot reach anything, and the failure looks like a broken explorer rather than a
 * misconfiguration. If `VITE_API_BASE_URL` is unset in a production build, the empty string
 * is used, which makes requests same-origin — a real 404/502 from the proxy, which is an
 * honest failure an operator can diagnose.
 *
 * Set `VITE_API_BASE_URL` explicitly when the API lives on a different host; the backend
 * then needs the origin in `BLOCKDIUM_CORS_ORIGINS`.
 */
const API_BASE_URL: string = import.meta.env.PROD
  ? ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '')
  : ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8080');

/** Error carrying the backend's code so the UI can distinguish 404 from 500. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  /** A missing block or transaction is a normal answer, not a failure. */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    // The API always returns the {error:{code,message}} envelope, but a proxy or a
    // crash may return HTML — so parsing is best-effort and must not mask the status.
    let code = 'unknown';
    let message = `HTTP ${res.status}`;

    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body?.error) {
        code = body.error.code;
        message = body.error.message;
      }
    } catch {
      // Keep the status-derived message.
    }

    throw new ApiError(res.status, code, message);
  }

  return (await res.json()) as T;
}

const qs = (params: Record<string, string | number | undefined>): string => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }

  const s = search.toString();

  return s ? `?${s}` : '';
};

export const api = {
  capabilities: (signal?: AbortSignal) => get<Capabilities>('/api/v1/capabilities', signal),

  blocks: (params: { limit?: number; before_height?: number }, signal?: AbortSignal) =>
    get<{ blocks: Block[]; next_before_height: number | null }>(
      `/api/v1/blocks${qs(params)}`,
      signal,
    ),

  /** Accepts a height or the literal "latest". */
  block: (height: number | 'latest', signal?: AbortSignal) =>
    get<Block>(`/api/v1/blocks/${height}`, signal),

  txs: (params: { limit?: number; before_height?: number }, signal?: AbortSignal) =>
    get<{ txs: Tx[]; next_before_height: number | null }>(`/api/v1/txs${qs(params)}`, signal),

  /** Resolves either the Cosmos hash or the EVM hash. */
  tx: (hash: string, signal?: AbortSignal) => get<Tx>(`/api/v1/txs/${hash}`, signal),

  ponaBlock: (height: number, signal?: AbortSignal) =>
    get<PonaBlock>(`/api/v1/pona/blocks/${height}`, signal),

  /** Accepts bech32 (rune1…) or 20-byte hex (0x…); both are the same 20 bytes. */
  address: (addr: string, signal?: AbortSignal) =>
    get<AddressSummary>(`/api/v1/addresses/${encodeURIComponent(addr)}`, signal),

  addressTxs: (
    addr: string,
    params: { limit?: number; before_height?: number },
    signal?: AbortSignal,
  ) =>
    get<{ txs: AddressTx[]; next_before_height: number | null }>(
      `/api/v1/addresses/${encodeURIComponent(addr)}/txs${qs(params)}`,
      signal,
    ),

  addressTransfers: (
    addr: string,
    params: { limit?: number; before_height?: number },
    signal?: AbortSignal,
  ) =>
    get<{ transfers: AddressTransfer[]; next_before_height: number | null }>(
      `/api/v1/addresses/${encodeURIComponent(addr)}/transfers${qs(params)}`,
      signal,
    ),

  ponaTier: (signal?: AbortSignal) => get<PonaTier>('/api/v1/pona/tier', signal),

  ponaBands: (window: number, signal?: AbortSignal) =>
    get<PonaBands>(`/api/v1/pona/bands${qs({ window })}`, signal),

  ponaPool: (signal?: AbortSignal) => get<PonaPool>('/api/v1/pona/pool', signal),
};

export { API_BASE_URL };

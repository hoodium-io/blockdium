import { useQuery } from '@tanstack/react-query';

import { api } from '../api/client';

/**
 * How often chain data is refetched.
 *
 * The chain targets a 6s block time, so 6s keeps the list at most one block stale
 * without hammering the API. `refetchIntervalInBackground` is left off so a
 * backgrounded tab does not poll.
 */
const CHAIN_INTERVAL = 6_000;

/** Slow-changing data (tier, capabilities) refetches far less often. */
const CONFIG_INTERVAL = 30_000;

export const queryKeys = {
  capabilities: ['capabilities'] as const,
  blocks: (limit: number, before?: number) => ['blocks', limit, before ?? null] as const,
  block: (height: number | 'latest') => ['block', height] as const,
  txs: (limit: number, before?: number) => ['txs', limit, before ?? null] as const,
  tx: (hash: string) => ['tx', hash] as const,
  ponaBlock: (height: number) => ['pona', 'block', height] as const,
  ponaTier: ['pona', 'tier'] as const,
  ponaBands: (window: number) => ['pona', 'bands', window] as const,
  ponaPool: ['pona', 'pool'] as const,
  address: (addr: string) => ['address', addr] as const,
  addressTxs: (addr: string, before?: number) => ['address', addr, 'txs', before ?? null] as const,
  addressTransfers: (addr: string, before?: number) =>
    ['address', addr, 'transfers', before ?? null] as const,
};

export function useCapabilities() {
  return useQuery({
    queryKey: queryKeys.capabilities,
    queryFn: ({ signal }) => api.capabilities(signal),
    refetchInterval: CONFIG_INTERVAL,
    staleTime: CONFIG_INTERVAL,
  });
}

export function useBlocks(params: { limit?: number; before_height?: number } = {}) {
  const limit = params.limit ?? 25;

  return useQuery({
    queryKey: queryKeys.blocks(limit, params.before_height),
    queryFn: ({ signal }) => api.blocks({ limit, before_height: params.before_height }, signal),
    refetchInterval: CHAIN_INTERVAL,
  });
}

export function useBlock(height: number | 'latest') {
  return useQuery({
    queryKey: queryKeys.block(height),
    queryFn: ({ signal }) => api.block(height, signal),
    refetchInterval: CHAIN_INTERVAL,
    // A block at a fixed height is immutable; "latest" is not.
    staleTime: height === 'latest' ? 0 : Infinity,
  });
}

export function useTxs(params: { limit?: number; before_height?: number } = {}) {
  const limit = params.limit ?? 25;

  return useQuery({
    queryKey: queryKeys.txs(limit, params.before_height),
    queryFn: ({ signal }) => api.txs({ limit, before_height: params.before_height }, signal),
    refetchInterval: CHAIN_INTERVAL,
  });
}

export function useTx(hash: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tx(hash ?? ''),
    queryFn: ({ signal }) => api.tx(hash as string, signal),
    enabled: Boolean(hash),
    // A mined transaction never changes.
    staleTime: Infinity,
  });
}

/**
 * The PoNA explanation for a block.
 *
 * `retry: false` for 404s: a height the indexer has not reached yet is a normal
 * answer and retrying it three times only delays the "not indexed yet" message.
 */
export function usePonaBlock(height: number | undefined) {
  return useQuery({
    queryKey: queryKeys.ponaBlock(height ?? 0),
    queryFn: ({ signal }) => api.ponaBlock(height as number, signal),
    enabled: typeof height === 'number' && Number.isFinite(height),
    staleTime: Infinity,
  });
}

export function usePonaTier() {
  return useQuery({
    queryKey: queryKeys.ponaTier,
    queryFn: ({ signal }) => api.ponaTier(signal),
    refetchInterval: CONFIG_INTERVAL,
  });
}

export function usePonaBands(window: number) {
  return useQuery({
    queryKey: queryKeys.ponaBands(window),
    queryFn: ({ signal }) => api.ponaBands(window, signal),
    refetchInterval: CHAIN_INTERVAL,
  });
}

export function usePonaPool() {
  return useQuery({
    queryKey: queryKeys.ponaPool,
    queryFn: ({ signal }) => api.ponaPool(signal),
    refetchInterval: CONFIG_INTERVAL,
  });
}

/** Address summary. `addr` may be bech32 or hex; both are the same 20 bytes. */
export function useAddress(addr: string | undefined) {
  return useQuery({
    queryKey: queryKeys.address(addr ?? ''),
    queryFn: ({ signal }) => api.address(addr as string, signal),
    enabled: Boolean(addr),
    refetchInterval: CHAIN_INTERVAL,
  });
}

export function useAddressTxs(addr: string | undefined, before?: number) {
  return useQuery({
    queryKey: queryKeys.addressTxs(addr ?? '', before),
    queryFn: ({ signal }) =>
      api.addressTxs(addr as string, { limit: 25, before_height: before }, signal),
    enabled: Boolean(addr),
    refetchInterval: CHAIN_INTERVAL,
  });
}

export function useAddressTransfers(addr: string | undefined, before?: number) {
  return useQuery({
    queryKey: queryKeys.addressTransfers(addr ?? '', before),
    queryFn: ({ signal }) =>
      api.addressTransfers(addr as string, { limit: 25, before_height: before }, signal),
    enabled: Boolean(addr),
    refetchInterval: CHAIN_INTERVAL,
  });
}

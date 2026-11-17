/**
 * Typed client for the Blockdium backend `/api/v1` API.
 *
 * Two conventions from the backend are load-bearing here and are encoded in the
 * types rather than left to call sites:
 *
 *  - Every amount arrives as `{ arune, rune }`. `rune` is a display string that is
 *    safe to print; `arune` is the exact base-unit integer as a string. Never parse
 *    `rune` into a float for arithmetic — 18 decimals do not survive it.
 *  - Unknown values are `null`, never `0`. A missing PoNA row or an absent snapshot
 *    is the absence of a fact, so the UI must render "—" instead of a misleading 0.
 */

/** Exact base-unit amount plus a pre-formatted display string. */
export interface Amount {
  /** Base units, e.g. "500000000000000000". Exact. */
  arune: string;
  /** Display form, e.g. "0.5". Derived by the backend; do not do maths on it. */
  rune: string;
}

export interface PonaBrief {
  band: string;
  tx_count: number;
  reward: Amount | null;
  validator: string | null;
}

export interface Block {
  height: number;
  hash: string;
  /** null for genesis: the chain stores 32 zero bytes, which the API normalises. */
  parent_hash: string | null;
  time: string;
  proposer_consensus_address: string;
  /** Raw entries in the block, INCLUDING the injected pseudo-tx. */
  num_txs: number;
  gas_wanted: number;
  gas_used: number;
  pona: PonaBrief | null;
}

export interface Tx {
  hash: string;
  eth_hash: string | null;
  height: number;
  tx_index: number;
  tx_type: 'evm' | 'cosmos';
  /** 1 = success, 0 = failed. */
  status: number;
  error_message: string | null;
  sender: string | null;
  evm_from: string | null;
  evm_to: string | null;
  contract_address: string | null;
  value: Amount;
  fee: Amount;
  gas_wanted: number;
  gas_used: number;
}

export interface Tier {
  tier_index: number;
  start_height: number;
  ends_at_height: number;
  ends_at_height_meaning: 'exclusive' | 'open_ended';
  low_tx_count_threshold: number;
  mid_tx_count_threshold: number;
  max_tx_count_threshold: number;
  max: Amount;
  mid: Amount;
  low: Amount;
  single: Amount;
  zero: Amount;
}

/** Full PoNA explanation for one block. */
export interface PonaBlock {
  height: number;
  tx_count: number;
  /** Raw block entries (pseudo-tx included); null when the block row is absent. */
  num_txs: number | null;
  band: string;
  reward: Amount;
  validator: string | null;
  denom: string;
  tier: Tier;
  band_explanation: string;
}

export interface PonaTier {
  current_height: number;
  tier: Tier;
  next_tier_start_height: number | null;
  blocks_until_next_tier: number | null;
  note?: string;
}

export interface BandBucket {
  band: string;
  blocks: number;
  share: number;
  reward: Amount;
}

export interface PonaBands {
  from_height: number;
  to_height: number;
  total_blocks: number;
  buckets: BandBucket[];
}

export interface PonaPool {
  height: number | null;
  balance: Amount | null;
  module_account: string;
  denom: string;
  snapshot_absent: boolean;
}

export interface Capabilities {
  chain: {
    chain_id: string;
    evm_chain_id: number;
    denoms: { base: string; hoodi: string };
  };
  indexer: {
    last_indexed_height: number;
    indexed_from_height: number;
    lag_blocks: number;
    blocks_stored: number;
    txs_stored: number;
  };
  modules: Record<string, { enabled: boolean }>;
}

/** Shape of the API's error envelope. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

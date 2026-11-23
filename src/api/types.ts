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

/** One rung of the ten-band ladder, with its RESOLVED count range from the API. */
export interface BandRow {
  band: string;
  /** Inclusive lower bound of the transaction count. */
  min: number;
  /** Inclusive upper bound; `null` for the open-ended top band (max). */
  max: number | null;
  reward: Amount;
  /** True for the band that actually applied to this block. */
  is_paid: boolean;
}

export interface Tier {
  tier_index: number;
  start_height: number;
  ends_at_height: number;
  ends_at_height_meaning: 'exclusive' | 'open_ended';

  /** The four stored thresholds. The five exact-count bands are derived from `low`. */
  low_tx_count_threshold: number;
  mid_tx_count_threshold: number;
  high_tx_count_threshold: number;
  max_tx_count_threshold: number;

  max: Amount;
  high: Amount;
  mid: Amount;
  low: Amount;
  quint: Amount;
  quart: Amount;
  trio: Amount;
  duo: Amount;
  single: Amount;
  zero: Amount;

  /**
   * All ten bands, busiest first, with exact ranges.
   *
   * ALWAYS render from this array rather than deriving ranges from the thresholds: under
   * dPona every threshold shifts by the difficulty offset, so arithmetic labels
   * (`${low}–${mid-1}`) become wrong, and `single` is a RANGE (1..low-5), not a point.
   */
  ladder: BandRow[];

  floor_applied: boolean;
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

  /** Dynamic difficulty active (equivalent to pona_diff > 0). */
  dpona: boolean;
  /** Difficulty in +10-transaction steps; 0 = off / base ladder. */
  pona_diff: number;
  /** Which pot paid: "reserve" | "fees" | "none" | null when the event did not say. */
  funding_source: 'reserve' | 'fees' | 'none' | null;
  /** Convenience: funding_source === "fees". */
  fee_funded: boolean;
}

export interface PonaTier {
  current_height: number;
  tier: Tier;
  next_tier_start_height: number | null;
  blocks_until_next_tier: number | null;
  note?: string;

  /** Head-level dPona state, read from the most recent indexed block. */
  dpona: boolean;
  /** Difficulty in +10-transaction steps; 0 = off / base ladder. */
  pona_diff: number;
  /** Which pot paid the most recent block: reserve | fees | none | null. */
  funding_source: 'reserve' | 'fees' | 'none' | null;
  /** Convenience: funding_source === "fees". */
  fee_funded: boolean;
  /** The height these head-level values were read from. */
  sample_height: number;
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

/** One ERC-20 transfer touching an address. */
export interface AddressTransfer {
  tx_hash: string;
  height: number;
  log_index: number;
  /** The token CONTRACT that emitted the Transfer. */
  token: string;
  from: string;
  to: string;
  /** Base units as a decimal string — exact. */
  amount: string;
  /** Display form. Assumes 18 decimals, which is true for Hoodium's own tokens. */
  amount_display: Amount;
  direction: 'in' | 'out' | 'self';
}

/** One transaction touching an address. */
export interface AddressTx {
  hash: string;
  height: number;
  tx_index: number;
  tx_type: 'evm' | 'cosmos';
  status: number;
  sender: string | null;
  direction: 'in' | 'out' | 'self' | 'contract';
}

/**
 * Address page header.
 *
 * `bech32` and `hex` are the same 20 bytes in two encodings, not two accounts.
 * `kind` is derived: "contract" when code is deployed there or it emitted a log.
 */
export interface AddressSummary {
  address: string;
  bech32: string;
  hex: string;
  kind: 'eoa' | 'contract';
  is_contract: boolean;
  tx_count: number;
  /** null when the address has never appeared — not 0, which would read as genesis. */
  first_seen_height: number | null;
  last_seen_height: number | null;
}

/** Shape of the API's error envelope. */
export interface ApiErrorBody {
  error: { code: string; message: string };
}

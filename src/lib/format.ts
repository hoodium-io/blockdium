import type { Amount } from '../api/types';

/** The single "no value" marker. Never render a bare 0 for an unknown. */
export const DASH = '—';

/**
 * Render an amount's display string.
 *
 * `rune` is already a correctly-rounded decimal string from the backend, so it is
 * printed verbatim. Falling back to DASH for null keeps the "unknown is not zero"
 * rule visible at every call site.
 */
export function formatAmount(a: Amount | null | undefined, suffix = 'RUNE'): string {
  if (!a) return DASH;

  return `${a.rune} ${suffix}`;
}

/** Base units as a grouped integer, e.g. "50,000,000,000,000,000,000". */
export function formatBaseUnits(a: Amount | null | undefined): string {
  if (!a) return DASH;

  return groupDigits(a.arune);
}

/** Group a decimal integer string with thousands separators. */
export function groupDigits(n: string | number): string {
  const s = String(n);
  const neg = s.startsWith('-');
  const body = neg ? s.slice(1) : s;

  let out = '';

  for (let i = 0; i < body.length; i++) {
    if (i > 0 && (body.length - i) % 3 === 0) out += ',';
    out += body[i];
  }

  return neg ? `-${out}` : out;
}

/** Truncate a hash for table display: 0x1234…abcd. */
export function shortHash(h: string | null | undefined, head = 10, tail = 8): string {
  if (!h) return DASH;
  if (h.length <= head + tail + 1) return h;

  return `${h.slice(0, head)}…${h.slice(-tail)}`;
}

/**
 * Format an RFC3339 timestamp.
 *
 * Block times are UTC. Rendering in the viewer's locale is intentional — an
 * operator comparing a log line to the UI needs local time — but the tooltip
 * should carry the raw value.
 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return DASH;

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Relative age, e.g. "12s ago". */
export function formatAge(iso: string | null | undefined): string {
  if (!iso) return DASH;

  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return DASH;

  const secs = Math.max(0, Math.floor((Date.now() - t) / 1000));

  if (secs < 60) return `${secs}s ago`;

  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

/** Human label for a PoNA band. */
export function bandLabel(band: string): string {
  const map: Record<string, string> = {
    max: 'Max activity',
    high: 'High activity',
    mid: 'Mid activity',
    low: 'Low activity',
    quint: 'Quint',
    quart: 'Quart',
    trio: 'Trio',
    duo: 'Duo',
    single: 'Single tx',
    zero: 'Zero activity',
    none: 'No tier',
  };

  return map[band] ?? band;
}

/**
 * Compact label for the ten-band ladder, where the full name would not fit.
 *
 * The five exact-count bands are named for the COUNT they cover (quint = five, quart =
 * four, trio = three, duo = two), which is why they read better short. Note that under
 * dPona the bound shifts with `low`, so these names describe the band's position in the
 * ladder rather than a fixed transaction count — the range column carries the truth.
 */
export function bandShortLabel(band: string): string {
  const map: Record<string, string> = {
    max: 'Max',
    high: 'High',
    mid: 'Mid',
    low: 'Low',
    quint: 'Quint',
    quart: 'Quart',
    trio: 'Trio',
    duo: 'Duo',
    single: 'Single',
    zero: 'Zero',
    none: 'none',
  };

  return map[band] ?? band;
}

/**
 * CSS class token for a band, so the colour scale lives in one place.
 *
 * The scale is deliberately ordered by activity, not by reward value: `zero` is the
 * floor and must look inert, `max` is a busy block and must look active. The five new
 * bands slot into that gradient between `low` and `single`.
 */
export function bandClass(band: string): string {
  return `band band--${band}`;
}

/**
 * Format a ladder row's transaction-count range from the API's resolved min/max.
 *
 * Never derive this from thresholds: under dPona they shift, and `single` is a genuine
 * range. `${low}–${mid-1}` produced "5–5 txs" and shifted bounds — exactly the bug this
 * replaces.
 */
export function formatTxRange(min: number, max: number | null): string {
  if (max === null) return `≥ ${min} txs`;
  if (min === max) return `${min} tx${min === 1 ? '' : 's'}`;
  if (min === 0 && max === 0) return 'no txs';

  return `${min}–${max} txs`;
}

/** Tx status: 1 = success, 0 = failed. */
export function statusLabel(status: number): string {
  return status === 1 ? 'Success' : 'Failed';
}

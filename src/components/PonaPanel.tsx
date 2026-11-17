import type { PonaBlock } from '../api/types';
import { DASH, bandClass, bandLabel, formatAmount, groupDigits } from '../lib/format';

/**
 * The PoNA panel: why this block paid what it paid.
 *
 * This is the component no general-purpose explorer can offer, so it is written to
 * answer the two questions people actually arrive with:
 *
 *   1. "Why did this block pay 0.5 RUNE and not 50?" — the whole rate ladder is
 *      shown with the paid band highlighted, so the answer is visible rather than
 *      inferred.
 *   2. "Is the chain idle, or is the indexer broken?" — `num_txs` (raw entries,
 *      including the injected vote-extension pseudo-tx) is displayed NEXT TO
 *      `tx_count` (regular transactions only). An idle Hoodium block legitimately
 *      reports 1 entry and 0 regular transactions; merging those numbers is the
 *      single most common source of confusion about this chain.
 */
export function PonaPanel({ pona }: { pona: PonaBlock }) {
  const { tier } = pona;

  const ladder = [
    { key: 'max', label: 'Max', rate: tier.max, threshold: `≥ ${tier.max_tx_count_threshold} txs` },
    {
      key: 'mid',
      label: 'Mid',
      rate: tier.mid,
      threshold: `${tier.mid_tx_count_threshold}–${tier.max_tx_count_threshold - 1} txs`,
    },
    {
      key: 'low',
      label: 'Low',
      rate: tier.low,
      threshold: `${tier.low_tx_count_threshold}–${tier.mid_tx_count_threshold - 1} txs`,
    },
    { key: 'single', label: 'Single', rate: tier.single, threshold: 'exactly 1 tx' },
    { key: 'zero', label: 'Zero', rate: tier.zero, threshold: 'no txs' },
  ] as const;

  const originalTxCount = pona.num_txs;

  return (
    <section className="pona" aria-labelledby="pona-heading">
      <header className="pona__header">
        <h2 id="pona-heading">Proof of Network Activity</h2>
        <span className={bandClass(pona.band)}>{bandLabel(pona.band)}</span>
      </header>

      <p className="pona__explanation">{pona.band_explanation}</p>

      <div className="pona__figures">
        <Figure label="Reward paid" value={formatAmount(pona.reward)} emphasis />
        <Figure label="Regular transactions" value={groupDigits(pona.tx_count)} />
        <Figure
          label="Raw block entries"
          value={originalTxCount === null || originalTxCount === undefined ? DASH : groupDigits(originalTxCount)}
          hint={
            originalTxCount === null || originalTxCount === undefined
              ? undefined
              : originalTxCount !== pona.tx_count
                ? 'Includes the injected vote-extension pseudo-tx'
                : undefined
          }
        />
        <Figure label="Emission tier" value={`${tier.tier_index + 1}`} hint={tierSummary(tier)} />
        <Figure label="Proposer" value={pona.validator ?? DASH} mono small />
      </div>

      <h3 className="pona__subheading">
        Emission ladder for tier {tier.tier_index + 1}
        <span className="pona__subtle">
          {' '}
          · heights {groupDigits(tier.start_height)}–
          {tier.ends_at_height === 0 ? 'open' : groupDigits(tier.ends_at_height - 1)}
        </span>
      </h3>

      <table className="pona__ladder">
        <thead>
          <tr>
            <th scope="col">Band</th>
            <th scope="col">Requires</th>
            <th scope="col" className="num">
              Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {ladder.map((row) => (
            <tr key={row.key} className={row.key === pona.band ? 'is-active' : undefined}>
              <td>
                <span className={bandClass(row.key)}>{row.label}</span>
                {row.key === pona.band && <span className="pona__paid">paid</span>}
              </td>
              <td className="pona__threshold">{row.threshold}</td>
              <td className="num">{formatAmount(row.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Figure({
  label,
  value,
  hint,
  emphasis,
  mono,
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
  mono?: boolean;
  small?: boolean;
}) {
  const cls = [
    'figure',
    emphasis ? 'figure--emphasis' : '',
    mono ? 'figure--mono' : '',
    small ? 'figure--small' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      <span className="figure__label">{label}</span>
      <span className="figure__value">{value}</span>
      {hint && <span className="figure__hint">{hint}</span>}
    </div>
  );
}

function tierSummary(tier: PonaBlock['tier']): string {
  if (tier.ends_at_height === 0) return 'open-ended';

  return `ends at height ${groupDigits(tier.ends_at_height)} (exclusive)`;
}

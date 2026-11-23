import type { BandRow, PonaBlock } from '../api/types';
import {
  DASH,
  bandClass,
  bandLabel,
  bandShortLabel,
  formatAmount,
  formatTxRange,
  groupDigits,
} from '../lib/format';

/**
 * The PoNA panel: why this block paid what it paid.
 *
 * Three questions drive the layout:
 *
 *   1. "Why did this block pay 0.5 RUNE and not 50?" — the whole ladder is shown with
 *      the paid band marked, so the answer is visible rather than inferred.
 *   2. "Is the chain idle, or is the indexer broken?" — `num_txs` (raw entries, including
 *      the injected pseudo-transaction) sits NEXT TO `tx_count` (regular transactions
 *      only). An idle block legitimately reports 1 entry and 0 regular transactions.
 *   3. "Why is the reward 0, and why has the ladder shifted?" — dPona and the funding pot
 *      are both surfaced, because neither is visible from the amount alone.
 *
 * # Why the ladder comes from `tier.ladder`
 *
 * The ten bands' ranges are resolved by the API (`{band, min, max, reward}`), mirroring
 * the chain's `Tier.Ladder()`. Deriving them here from thresholds was the old bug:
 *
 *   - `${low}–${mid-1}` renders "5–5 txs" for an exact-count band,
 *   - under dPona every threshold shifts by the difficulty offset, so every label
 *     silently moves,
 *   - and `single` is a RANGE (1..low-5), not a point.
 *
 * So this component never computes a range: it reads `min`/`max` and formats them.
 */
export function PonaPanel({ pona }: { pona: PonaBlock }) {
  const { tier } = pona;
  const originalTxCount = pona.num_txs;

  return (
    <section className="pona" aria-labelledby="pona-heading">
      <header className="pona__header">
        <h2 id="pona-heading">Proof of Network Activity</h2>
        <span className={bandClass(pona.band)}>{bandLabel(pona.band)}</span>
        {pona.fee_funded && (
          <span
            className="pona__badge pona__badge--fees"
            title="The validator reward pool could not cover this reward, so the block's own transaction fees paid it"
          >
            fee-funded
          </span>
        )}
        {pona.dpona && (
          <span
            className="pona__badge pona__badge--dpona"
            title="Dynamic difficulty active: the ladder thresholds are shifted"
          >
            dPona +{pona.pona_diff}
          </span>
        )}
      </header>

      <p className="pona__explanation">{pona.band_explanation}</p>

      {pona.fee_funded && <FeeFundedNote rewardIsZero={pona.reward.arune === '0'} />}

      <div className="pona__figures">
        <Figure label="Reward paid" value={formatAmount(pona.reward)} emphasis />
        <Figure label="Regular transactions" value={groupDigits(pona.tx_count)} />
        <Figure
          label="Raw block entries"
          value={
            originalTxCount === null || originalTxCount === undefined
              ? DASH
              : groupDigits(originalTxCount)
          }
          hint={
            originalTxCount !== null &&
            originalTxCount !== undefined &&
            originalTxCount !== pona.tx_count
              ? 'Includes the injected vote-extension pseudo-tx'
              : undefined
          }
        />
        <Figure
          label="dPona"
          value={pona.dpona ? 'On' : 'Off'}
          hint={pona.dpona ? `difficulty +${pona.pona_diff}` : 'base ladder'}
        />
        <Figure
          label="Pona diff"
          value={groupDigits(pona.pona_diff)}
          hint={pona.pona_diff === 0 ? 'no offset' : `+${pona.pona_diff * 10} txs on every threshold`}
        />
        <Figure
          label="Funded by"
          value={fundingLabel(pona.funding_source)}
          hint={fundingHint(pona.funding_source)}
        />
        <Figure label="Emission tier" value={`${tier.tier_index + 1}`} hint={tierSummary(pona)} />
        <Figure label="Proposer" value={pona.validator ?? DASH} mono small />
      </div>

      <h3 className="pona__subheading">
        Emission ladder for tier {tier.tier_index + 1}
        <span className="pona__subtle">
          {' '}
          · heights {groupDigits(tier.start_height)}–
          {tier.ends_at_height === 0 ? 'open' : groupDigits(tier.ends_at_height - 1)}
          {pona.dpona && ` · thresholds shifted +${pona.pona_diff}`}
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
          {tier.ladder.map((row) => (
            <LadderRow key={row.band} row={row} feeFunded={pona.fee_funded} />
          ))}
        </tbody>
      </table>

      <p className="pona__footnote muted">
        Ranges are the ones the chain applied at this height. They shift with dPona, so they
        are read from the API rather than computed here.
      </p>
    </section>
  );
}

function LadderRow({ row, feeFunded }: { row: BandRow; feeFunded: boolean }) {
  // A fee-funded zero band pays 0: an empty block collects no fees. Flag it inline so the
  // 0 does not read as a bug.
  const zeroUnderFees = feeFunded && row.band === 'zero';

  return (
    <tr className={row.is_paid ? 'is-active' : undefined}>
      <td>
        <span className={bandClass(row.band)}>{bandShortLabel(row.band)}</span>
        {row.is_paid && <span className="pona__paid">paid</span>}
      </td>
      <td className="pona__threshold">{formatTxRange(row.min, row.max)}</td>
      <td className="num">
        {formatAmount(row.reward)}
        {zeroUnderFees && (
          <span
            className="pona__zero-note"
            title="Fee-only: an empty block collects no fees, so nothing can be re-allocated"
          >
            {' '}
            (no fees)
          </span>
        )}
      </td>
    </tr>
  );
}

/**
 * Explains fee-funded mode, which is a normal economic state rather than an error.
 *
 * The reserve is a finite pre-funded pool. When it can no longer cover the scheduled
 * reward, the chain switches to re-allocating the block's own fees, clamped to what those
 * fees can actually pay. An empty block therefore collects 0, and the zero band pays 0.
 * Without this note the 0 looks like a broken reward.
 */
function FeeFundedNote({ rewardIsZero }: { rewardIsZero: boolean }) {
  return (
    <p className="pona__note pona__note--fees">
      <strong>Fee-funded.</strong> The validator reward pool could not cover the scheduled
      reward, so this block paid from its own transaction fees instead — no new RUNE was
      minted.{' '}
      {rewardIsZero
        ? 'This block collected no fees, so it paid 0. That is the expected fee-only result for an empty block, not a failure.'
        : 'The amount is capped by what the block’s fees could cover.'}
    </p>
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

function fundingLabel(src: PonaBlock['funding_source']): string {
  switch (src) {
    case 'reserve':
      return 'Reward reserve';
    case 'fees':
      return 'Block fees';
    case 'none':
      return 'Nothing paid';
    default:
      // null: the event predates the attribute. Saying "unknown" is honest; "reserve"
      // would be a claim the event never made.
      return 'Unknown';
  }
}

function fundingHint(src: PonaBlock['funding_source']): string | undefined {
  switch (src) {
    case 'reserve':
      return 'pre-funded validator reward pool';
    case 'fees':
      return 'reserve exhausted; re-allocated from this block’s fees';
    case 'none':
      return 'no tier covers this height and the reserve could not pay';
    default:
      return 'this block predates the funding_source attribute';
  }
}

function tierSummary(pona: PonaBlock): string {
  const { tier } = pona;

  if (tier.ends_at_height === 0) return 'open-ended';

  return `ends at height ${groupDigits(tier.ends_at_height)} (exclusive)`;
}

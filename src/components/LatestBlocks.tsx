import { Link } from 'react-router-dom';

import type { BandBucket, Block } from '../api/types';
import { DASH, bandClass, bandLabel, formatAge, formatAmount, groupDigits, shortHash } from '../lib/format';
import { StateGate } from '../components/StateGate';

/** Newest blocks, shared by the overview page. */
export function LatestBlocks({
  isLoading,
  error,
  data,
}: {
  isLoading: boolean;
  error: unknown;
  data: { blocks: Block[] } | undefined;
}) {
  return (
    <div className="card">
      <h2>Latest blocks</h2>
      <StateGate isLoading={isLoading} error={error} data={data} emptyMessage="No blocks indexed yet.">
        {(d) => (
          <table className="table table--compact">
            <thead>
              <tr>
                <th scope="col">Height</th>
                <th scope="col">Age</th>
                <th scope="col">Hash</th>
                <th scope="col" className="num">
                  Entries
                </th>
                <th scope="col" className="num">
                  Reg. txs
                </th>
                <th scope="col">Band</th>
                <th scope="col" className="num">
                  Reward
                </th>
              </tr>
            </thead>
            <tbody>
              {d.blocks.map((blk) => (
                <tr key={blk.height}>
                  <td>
                    <Link to={`/blocks/${blk.height}`}>{groupDigits(blk.height)}</Link>
                  </td>
                  <td className="muted">{formatAge(blk.time)}</td>
                  <td className="mono">{shortHash(blk.hash)}</td>
                  <td className="num">{blk.num_txs}</td>
                  <td className="num">{blk.pona ? blk.pona.tx_count : DASH}</td>
                  <td>
                    {blk.pona ? (
                      <span className={bandClass(blk.pona.band)}>{bandLabel(blk.pona.band)}</span>
                    ) : (
                      DASH
                    )}
                  </td>
                  <td className="num">{blk.pona ? formatAmount(blk.pona.reward) : DASH}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </StateGate>
    </div>
  );
}

/**
 * Proportional bar of band shares.
 *
 * Segments below ~8% are unlabelled because text would not fit; the tooltip carries
 * the exact figures, and the legend below repeats them so the information is never
 * hover-only (which would exclude keyboard and touch users).
 */
export function BandBar({ buckets, total }: { buckets: BandBucket[]; total: number }) {
  if (total === 0) return <p className="muted">No data in this window.</p>;

  return (
    <>
      <div className="bar" role="img" aria-label="Share of blocks by PoNA band">
        {buckets.map((b) => (
          <div
            key={b.band}
            className={`bar__seg ${bandClass(b.band)}`}
            style={{ flexGrow: Math.max(b.share, 0.001) }}
            title={`${bandLabel(b.band)}: ${groupDigits(b.blocks)} blocks (${(b.share * 100).toFixed(2)}%)`}
          >
            {b.share > 0.08 && <span className="bar__label">{bandLabel(b.band)}</span>}
          </div>
        ))}
      </div>

      <ul className="legend">
        {buckets.map((b) => (
          <li key={b.band}>
            <span className={bandClass(b.band)}>{bandLabel(b.band)}</span>{' '}
            <span className="muted">
              {groupDigits(b.blocks)} blocks · {(b.share * 100).toFixed(2)}% ·{' '}
              {formatAmount(b.reward)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

import { Link } from 'react-router-dom';

import { useBlocks } from '../hooks/queries';
import { DASH, bandClass, bandLabel, formatAge, formatAmount, formatTime, groupDigits, shortHash } from '../lib/format';
import { StateGate } from '../components/StateGate';

/**
 * Newest-first block list.
 *
 * `num_txs` and the PoNA `tx_count` are separate columns on purpose: an idle block
 * shows "1" and "0" together, which is correct and is the thing this explorer exists
 * to make legible.
 */
export function BlockListPage() {
  const query = useBlocks({ limit: 25 });
  const blocks = query.data?.blocks ?? [];

  return (
    <section>
      <h1>Blocks</h1>

      <StateGate
        isLoading={query.isLoading}
        error={query.error}
        data={query.data}
        emptyMessage="No blocks indexed yet. Has the indexer run?"
      >
        {() => (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Height</th>
                <th scope="col">Age</th>
                <th scope="col">Time</th>
                <th scope="col">Block hash</th>
                <th scope="col" className="num">
                  Entries
                </th>
                <th scope="col" className="num">
                  Reg. txs
                </th>
                <th scope="col">PoNA band</th>
                <th scope="col" className="num">
                  Reward
                </th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.height}>
                  <td>
                    <Link to={`/blocks/${b.height}`}>{groupDigits(b.height)}</Link>
                  </td>
                  <td className="muted">{formatAge(b.time)}</td>
                  <td className="muted" title={b.time}>
                    {formatTime(b.time)}
                  </td>
                  <td className="mono">{shortHash(b.hash)}</td>
                  <td className="num">{b.num_txs}</td>
                  <td className="num">{b.pona ? b.pona.tx_count : DASH}</td>
                  <td>
                    {b.pona ? (
                      <span className={bandClass(b.pona.band)}>{bandLabel(b.pona.band)}</span>
                    ) : (
                      DASH
                    )}
                  </td>
                  <td className="num">{b.pona ? formatAmount(b.pona.reward) : DASH}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </StateGate>

      {query.data && query.data.next_before_height !== null && (
        <p className="pager">
          Newest 25 blocks shown. Older blocks are available from the API via{' '}
          <code>?before_height={query.data.next_before_height}</code>.
        </p>
      )}
    </section>
  );
}

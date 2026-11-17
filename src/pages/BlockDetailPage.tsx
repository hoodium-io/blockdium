import { Link, useParams } from 'react-router-dom';

import { useBlock, usePonaBlock } from '../hooks/queries';
import { DASH, formatTime, groupDigits, shortHash } from '../lib/format';
import { StateGate } from '../components/StateGate';
import { PonaPanel } from '../components/PonaPanel';

/**
 * One block: header facts plus the PoNA panel.
 *
 * Two independent queries are used rather than one combined endpoint. The block row
 * and its PoNA explanation can legitimately have different availability (the PoNA row
 * is derived from an event), and the header is worth showing even if the panel fails.
 */
export function BlockDetailPage() {
  const params = useParams<{ height: string }>();
  const raw = params.height ?? '';
  const height = raw === 'latest' ? ('latest' as const) : Number(raw);
  const valid = raw === 'latest' || (Number.isFinite(height) && Number(height) > 0);

  const blockQuery = useBlock(valid ? height : 'latest');
  const resolvedHeight = blockQuery.data?.height;
  const ponaQuery = usePonaBlock(resolvedHeight);

  if (!valid) {
    return <div className="state state--notfound">“{raw}” is not a block height.</div>;
  }

  return (
    <section>
      <nav className="breadcrumb">
        <Link to="/blocks">Blocks</Link> <span aria-hidden="true">/</span>{' '}
        <span>{blockQuery.data ? groupDigits(blockQuery.data.height) : raw}</span>
      </nav>

      <StateGate
        isLoading={blockQuery.isLoading}
        error={blockQuery.error}
        data={blockQuery.data}
        notFoundMessage={`Block ${raw} is not indexed. The indexer may not have reached this height yet.`}
      >
        {(b) => (
          <>
            <h1>Block {groupDigits(b.height)}</h1>

            <dl className="facts">
              <Fact label="Block hash" value={b.hash} mono copyable />
              <Fact
                label="Parent hash"
                // null at genesis: the API normalises the 32 zero bytes the column
                // stores, so this must not print a plausible-looking zero hash.
                value={b.parent_hash ?? DASH}
                hint={b.parent_hash === null ? 'Genesis has no parent' : undefined}
                mono
                copyable={Boolean(b.parent_hash)}
              />
              <Fact label="Time" value={formatTime(b.time)} hint={b.time} />
              <Fact label="Proposer" value={b.proposer_consensus_address} mono copyable />
              <Fact label="Raw entries" value={String(b.num_txs)} />
              <Fact
                label="Gas used / wanted"
                value={`${groupDigits(b.gas_used)} / ${groupDigits(b.gas_wanted)}`}
              />
            </dl>

            {ponaQuery.isLoading && <div className="state state--loading">Loading PoNA…</div>}

            {ponaQuery.error && (
              <div className="state state--error">
                PoNA data unavailable for this block.
                <span className="state__hint">
                  {ponaQuery.error instanceof Error ? ponaQuery.error.message : String(ponaQuery.error)}
                </span>
              </div>
            )}

            {ponaQuery.data && <PonaPanel pona={ponaQuery.data} />}

            <div className="btnrow">
              {b.height > 1 && <Link className="btn" to={`/blocks/${b.height - 1}`}>← Previous</Link>}
              <Link className="btn" to={`/blocks/${b.height + 1}`}>Next →</Link>
              <Link className="btn" to="/blocks">All blocks</Link>
            </div>
          </>
        )}
      </StateGate>
    </section>
  );
}

function Fact({
  label,
  value,
  hint,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined} title={hint ?? value}>
        {value}
        {copyable && value !== DASH && (
          <button
            type="button"
            className="copy"
            onClick={() => void navigator.clipboard?.writeText(value)}
            aria-label={`Copy ${label}`}
          >
            copy
          </button>
        )}
      </dd>
    </>
  );
}

export { shortHash };

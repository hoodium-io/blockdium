import { Fragment } from 'react';

import { useCapabilities, useBlocks, usePonaBands, usePonaTier } from '../hooks/queries';
import { bandShortLabel, formatAmount, formatTxRange, groupDigits } from '../lib/format';
import { StateGate } from '../components/StateGate';
import { BandBar, LatestBlocks } from '../components/LatestBlocks';

/**
 * Explorer home: indexer status, active emission tier, band distribution and the
 * newest blocks.
 *
 * The band distribution is the piece that makes PoNA legible at a glance: a chain
 * paying only the `zero` floor should look obviously idle rather than broken, which
 * a single "current reward" number cannot convey.
 */
export function OverviewPage() {
  const caps = useCapabilities();
  const tier = usePonaTier();
  const bands = usePonaBands(1000);
  const blocks = useBlocks({ limit: 10 });

  return (
    <section>
      <h1>Blockdium</h1>
      <p className="lede">
        The Hoodium block explorer, built around Proof of Network Activity — the reward a
        block earns depends on how many regular transactions it carried.
      </p>

      <div className="cards">
        <div className="card">
          <h2>Indexer</h2>
          <StateGate isLoading={caps.isLoading} error={caps.error} data={caps.data}>
            {(c) => (
              <dl className="facts facts--compact">
                <dt>Chain</dt>
                <dd className="mono">{c.chain.chain_id}</dd>
                <dt>EVM chain id</dt>
                <dd>{c.chain.evm_chain_id}</dd>
                <dt>Head indexed</dt>
                <dd>{groupDigits(c.indexer.last_indexed_height)}</dd>
                <dt>Indexed from</dt>
                <dd>{groupDigits(c.indexer.indexed_from_height)}</dd>
                <dt>Lag</dt>
                <dd className={c.indexer.lag_blocks > 5 ? 'status status--fail' : 'status status--ok'}>
                  {c.indexer.lag_blocks} blocks
                </dd>
                <dt>Blocks stored</dt>
                <dd>{groupDigits(c.indexer.blocks_stored)}</dd>
                <dt>Transactions</dt>
                <dd>{groupDigits(c.indexer.txs_stored)}</dd>
              </dl>
            )}
          </StateGate>
        </div>

        <div className="card">
          <h2>Active emission tier</h2>
          <StateGate isLoading={tier.isLoading} error={tier.error} data={tier.data}>
            {(t) => (
              <>
                <p className="tierhead">
                  Tier {t.tier.tier_index + 1} · max {formatAmount(t.tier.max)}
                </p>
                {/*
                  Rendered from tier.ladder rather than named fields: the ten bands and
                  their ranges come resolved from the API, so this card cannot drift when
                  the schedule changes or dPona shifts the thresholds.
                */}
                <dl className="facts facts--compact">
                  {t.tier.ladder.map((row) => (
                    <Fragment key={row.band}>
                      <dt>{bandShortLabel(row.band)}</dt>
                      <dd>
                        {formatAmount(row.reward)} · {formatTxRange(row.min, row.max)}
                      </dd>
                    </Fragment>
                  ))}
                  <dt>Next tier</dt>
                  <dd>
                    {t.next_tier_start_height === null
                      ? (t.note ?? 'none')
                      : `height ${groupDigits(t.next_tier_start_height)} · in ${groupDigits(
                          t.blocks_until_next_tier ?? 0,
                        )} blocks`}
                  </dd>
                </dl>
              </>
            )}
          </StateGate>
        </div>
      </div>

      <div className="card">
        <h2>PoNA band distribution · last 1,000 blocks</h2>
        <StateGate isLoading={bands.isLoading} error={bands.error} data={bands.data}>
          {(b) => (
            <>
              <p className="muted">
                Heights {groupDigits(b.from_height)}–{groupDigits(b.to_height)} ·{' '}
                {groupDigits(b.total_blocks)} blocks
              </p>
              <BandBar buckets={b.buckets} total={b.total_blocks} />
            </>
          )}
        </StateGate>
      </div>

      <LatestBlocks
        isLoading={blocks.isLoading}
        error={blocks.error}
        data={blocks.data}
      />
    </section>
  );
}

import { Fragment } from 'react';

import type { Capabilities, PonaTier } from '../api/types';
import { useCapabilities, useBlocks, usePonaBands, usePonaTier } from '../hooks/queries';
import { bandShortLabel, formatAmount, formatTxRange, groupDigits } from '../lib/format';
import { StateGate } from '../components/StateGate';
import { BandBar, LatestBlocks } from '../components/LatestBlocks';
import { Drawer } from '../components/Drawer';

/**
 * Explorer home.
 *
 * The page keeps only what a visitor came for — the PoNA chart and recent blocks. The two
 * reference panels (chain status, emission ladder) live in side drawers so they are one
 * click away without competing for the centre of the screen or pushing the chart below the
 * fold.
 *
 * The drawers are push-style, not modals: opening the ladder must not hide the band chart,
 * because the two are read together ("what was paid" vs "what the ladder pays").
 */
export function OverviewPage() {
  const caps = useCapabilities();
  const tier = usePonaTier();
  const bands = usePonaBands(1000);
  const blocks = useBlocks({ limit: 10 });

  return (
    <section>
      <header className="pagehead">
        <h1>Blockdium</h1>
        <p className="lede">
          The Hoodium block explorer, built around Proof of Network Activity — the reward a
          block earns depends on how many regular transactions it carried.
        </p>
      </header>

      <PonaToday
        tierLoading={tier.isLoading}
        tierError={tier.error}
        tier={tier.data}
        bandsLoading={bands.isLoading}
        bandsError={bands.error}
        bands={bands.data}
      />

      <LatestBlocks isLoading={blocks.isLoading} error={blocks.error} data={blocks.data} />

      {/* Docked at the viewport edges, outside the centred column. */}
      <Drawer side="left" label="Chain status" subtitle="Indexer progress and chain identity">
        <ChainStatus isLoading={caps.isLoading} error={caps.error} data={caps.data} />
      </Drawer>

      <Drawer
        side="right"
        label="Emission ladder"
        subtitle="The ten bands of the active tier, with the ranges the chain applied"
      >
        <StateGate isLoading={tier.isLoading} error={tier.error} data={tier.data}>
          {(t) => <LadderTable tier={t} />}
        </StateGate>
      </Drawer>
    </section>
  );
}


/** Compact chain/indexer status strip. */
function ChainStatus({
  isLoading,
  error,
  data,
}: {
  isLoading: boolean;
  error: unknown;
  data: Capabilities | undefined;
}) {
  // No card wrapper: the drawer already provides the surface. A nested card here would
  // draw a second border inside the panel.
  return (
    <StateGate isLoading={isLoading} error={error} data={data}>
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
          <dt>Base denom</dt>
          <dd className="mono">{c.chain.denoms.base}</dd>
          <dt>HOODI denom</dt>
          <dd className="mono">{c.chain.denoms.hoodi}</dd>
        </dl>
      )}
    </StateGate>
  );
}

/**
 * Band distribution together with the live dPona / funding state.
 *
 * Placed together on purpose: the chart answers "what did the chain pay?", and dPona
 * answers "were the thresholds shifted when it paid that?". Reading only the chart would
 * leave a shifted ladder looking like a bug.
 */
function PonaToday({
  tierLoading,
  tierError,
  tier,
  bandsLoading,
  bandsError,
  bands,
}: {
  tierLoading: boolean;
  tierError: unknown;
  tier: PonaTier | undefined;
  bandsLoading: boolean;
  bandsError: unknown;
  bands: import('../api/types').PonaBands | undefined;
}) {
  return (
    <div className="card">
      <h2>PoNA · last 1,000 blocks</h2>

      <StateGate isLoading={bandsLoading} error={bandsError} data={bands}>
        {(b) => (
          <>
            <div className="bandhead">
              <span className="muted">
                Heights {groupDigits(b.from_height)}–{groupDigits(b.to_height)} ·{' '}
                {groupDigits(b.total_blocks)} blocks
              </span>
            </div>
            <BandBar buckets={b.buckets} total={b.total_blocks} />
          </>
        )}
      </StateGate>

      <div className="pona-now">
        <StateGate isLoading={tierLoading} error={tierError} data={tier}>
          {(t) => (
            <>
              <NowFigure
                label="dPona"
                value={t.dpona ? 'On' : 'Off'}
                tone={t.dpona ? 'accent' : undefined}
                hint={
                  t.dpona
                    ? `difficulty active: +${t.pona_diff} step${t.pona_diff === 1 ? '' : 's'}`
                    : 'base ladder, no offset'
                }
              />
              <NowFigure
                label="Pona diff"
                value={groupDigits(t.pona_diff)}
                tone={t.pona_diff > 0 ? 'accent' : undefined}
                hint={
                  t.pona_diff === 0
                    ? 'no shift on any threshold'
                    : `every threshold shifted +${t.pona_diff * 10} txs`
                }
              />
              <NowFigure
                label="Funding"
                value={fundingLabel(t.funding_source)}
                tone={t.fee_funded ? 'warn' : undefined}
                hint={
                  t.fee_funded
                    ? 'reserve exhausted: fees pay the reward'
                    : t.funding_source === 'none'
                      ? 'nothing paid for this block'
                      : 'paid from the pre-funded reserve'
                }
              />
              <NowFigure
                label="Sampled at"
                value={groupDigits(t.sample_height)}
                hint="height these values were read from"
              />
            </>
          )}
        </StateGate>
      </div>
    </div>
  );
}

/** The ten-band rate card for the active tier. */
function LadderTable({ tier: t }: { tier: PonaTier }) {
  return (
    <>
      <div className="bandhead">
        <span className="tierhead">
          Tier {t.tier.tier_index + 1} · max {formatAmount(t.tier.max)}
        </span>
        <span className="muted">
          heights {groupDigits(t.tier.start_height)}–
          {t.tier.ends_at_height === 0 ? 'open' : groupDigits(t.tier.ends_at_height - 1)}
          {t.next_tier_start_height !== null &&
            ` · next tier in ${groupDigits(t.blocks_until_next_tier ?? 0)} blocks`}
        </span>
      </div>

      <table className="table table--compact ladder">
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
          {t.tier.ladder.map((row) => (
            <Fragment key={row.band}>
              <tr>
                <td>
                  <span className={`band band--${row.band}`}>{bandShortLabel(row.band)}</span>
                </td>
                <td className="pona__threshold">{formatTxRange(row.min, row.max)}</td>
                <td className="num">{formatAmount(row.reward)}</td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>

      <p className="pona__footnote muted">
        Ranges come from the chain, so they follow dPona. They are not computed here.
      </p>
    </>
  );
}

function NowFigure({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'accent' | 'warn';
}) {
  const cls = ['now', tone ? `now--${tone}` : ''].filter(Boolean).join(' ');

  return (
    <div className={cls} title={hint}>
      <span className="now__label">{label}</span>
      <span className="now__value">{value}</span>
      {hint && <span className="now__hint">{hint}</span>}
    </div>
  );
}

function fundingLabel(src: PonaTier['funding_source']): string {
  switch (src) {
    case 'reserve':
      return 'Reward reserve';
    case 'fees':
      return 'Block fees';
    case 'none':
      return 'Nothing paid';
    default:
      return 'Unknown';
  }
}

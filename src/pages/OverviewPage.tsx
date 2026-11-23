import { Fragment } from 'react';

import type { Capabilities, PonaBands, PonaTier } from '../api/types';
import { useCapabilities, useBlocks, usePonaBands, usePonaTier } from '../hooks/queries';
import { bandShortLabel, formatAmount, formatTxRange, groupDigits } from '../lib/format';
import { StateGate } from '../components/StateGate';
import { BandBar, LatestBlocks } from '../components/LatestBlocks';
import { Drawer } from '../components/Drawer';
import { SearchBox } from '../components/SearchBox';

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
      {/*
        Hero: the page title and the primary action (search).
        The descriptive paragraph moved to the footer, where it reads as context rather than
        preamble — a returning visitor does not need the pitch on every load.
      */}
      <header className="hero">
        <h1>The Hoodium Block Explorer</h1>
        <div className="hero__search">
          <SearchBox />
        </div>
      </header>

      <div className="ponagrid">
        <PonaBandsCard isLoading={bands.isLoading} error={bands.error} data={bands.data} />
        <DPonaCard isLoading={tier.isLoading} error={tier.error} data={tier.data} />
      </div>

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
/**
 * Band distribution card.
 *
 * Kept compact on purpose: it shares a row with the dPona card, so every extra line here
 * steals width from that panel. The band bar carries the meaning; the header line gives
 * the window it covers and nothing more.
 */
function PonaBandsCard({
  isLoading,
  error,
  data,
}: {
  isLoading: boolean;
  error: unknown;
  data: PonaBands | undefined;
}) {
  return (
    <div className="card card--compact">
      <h2>PoNA band distribution</h2>

      <StateGate isLoading={isLoading} error={error} data={data}>
        {(b) => (
          <>
            <div className="bandhead">
              <span className="muted">
                {groupDigits(b.total_blocks)} blocks · heights {groupDigits(b.from_height)}–
                {groupDigits(b.to_height)}
              </span>
            </div>
            <BandBar buckets={b.buckets} total={b.total_blocks} />
          </>
        )}
      </StateGate>
    </div>
  );
}

/**
 * dPona / difficulty card.
 *
 * Deliberately small and separate from the band chart: the chart answers "what did the
 * chain pay?", and this answers "were the thresholds shifted when it paid that?" — a
 * different question that a reader scans rather than reads.
 *
 * Funding source and the sampling height are intentionally NOT shown here. Funding is a
 * per-block fact already surfaced on the block detail panel, and restating it at chain
 * level implied it was a chain-wide setting; the sampling height was diagnostic noise.
 */
function DPonaCard({
  isLoading,
  error,
  data,
}: {
  isLoading: boolean;
  error: unknown;
  data: PonaTier | undefined;
}) {
  return (
    <div className="card card--compact card--narrow">
      <h2>dPona</h2>

      <StateGate isLoading={isLoading} error={error} data={data}>
        {(t) => (
          <div className="dpona">
            <div className={`dpona__state${t.dpona ? ' is-active' : ''}`}>
              <span className="dpona__pill">{t.dpona ? 'Active' : 'Off'}</span>
              <span className="dpona__caption">
                {t.dpona ? 'dynamic difficulty' : 'base ladder'}
              </span>
            </div>

            <div className="dpona__diff">
              <span className="dpona__label">Pona diff</span>
              <span className={`dpona__value${t.pona_diff > 0 ? ' is-active' : ''}`}>
                {groupDigits(t.pona_diff)}
              </span>
              <span className="dpona__caption">
                {t.pona_diff === 0
                  ? 'no threshold shift'
                  : `+${groupDigits(t.pona_diff * 10)} txs on every threshold`}
              </span>
            </div>
          </div>
        )}
      </StateGate>
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



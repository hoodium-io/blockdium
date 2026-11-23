import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom';

import { useCapabilities } from './hooks/queries';
import { AddNetworkButton } from './components/AddNetworkButton';
import { OverviewPage } from './pages/OverviewPage';
import { BlockListPage } from './pages/BlockListPage';
import { BlockDetailPage } from './pages/BlockDetailPage';
import { TxDetailPage, TxListPage } from './pages/TxPages';
import { AddressPage } from './pages/AddressPage';

/**
 * Application shell.
 *
 * The header is TWO rows, both constrained to the same max-width as the body so their
 * contents line up with the page edges rather than the viewport edges:
 *
 *   row 1 (top)    prices · gas on the left, network name on the right
 *   row 2 (main)   brand + nav on the left, wallet button on the right
 *
 * The search box deliberately lives in the page hero instead of here: it is the primary
 * action on the overview, and burying it in the chrome left it competing with navigation
 * for space.
 */
export default function App() {
  const caps = useCapabilities();

  return (
    <div className="app">
      <header className="topbar">
        {/* Top strip: market/pricing placeholders and gas. */}
        <div className="topbar__inner topbar__inner--top">
          <div className="ticker">
            <span className="ticker__item">
              RUNE Price: <strong className="ticker__tba">TBA</strong>
            </span>
            <span className="ticker__sep" aria-hidden="true">
              ·
            </span>
            <span className="ticker__item">
              HOODI Price: <strong className="ticker__tba">TBA</strong>
            </span>
            <span className="ticker__sep" aria-hidden="true">
              |
            </span>
            <span className="ticker__item" title="Base fee per gas from the latest indexed block">
              Gas: <strong>{gasLabel(caps.data)}</strong>
            </span>
          </div>

          <span className="netname" title={caps.data ? caps.data.chain.chain_id : undefined}>
            Devnet
          </span>
        </div>

        {/* Main strip: identity, navigation, wallet. */}
        <div className="topbar__inner topbar__inner--main">
          <Link to="/" className="brand">
            Block<span>dium</span>
            <sup className="beta" title="Under heavy development — data and layout may change">
              beta
            </sup>
          </Link>

          <nav className="nav">
            <NavLink to="/" end>
              Overview
            </NavLink>
            <NavLink to="/blocks">Blocks</NavLink>
            <NavLink to="/txs">Transactions</NavLink>
          </nav>

          <div className="stats">
            <AddNetworkButton />
            {caps.data && caps.data.indexer.lag_blocks > 5 && (
              <span className="status status--fail">lagging {caps.data.indexer.lag_blocks}</span>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/blocks" element={<BlockListPage />} />
          <Route path="/blocks/:height" element={<BlockDetailPage />} />
          <Route path="/txs" element={<TxListPage />} />
          <Route path="/txs/:hash" element={<TxDetailRoute />} />
          <Route path="/addresses/:addr" element={<AddressRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__brand">
            <strong>
              Block<span className="brand-accent">dium</span>
            </strong>
            <span className="muted">
              The Hoodium block explorer, built around Proof of Network Activity — the reward a
              block earns depends on how many regular transactions it carried.
            </span>
          </div>

          <div className="footer__meta">
            <span>
              Hoodium Devnet{' '}
              <span className="mono" title="chain-id">
                rune_6592-1
              </span>
            </span>
            <span className="muted">Hoodium-only. Not a general-purpose EVM explorer.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Gas figure for the header.
 *
 * Falls back to "—" rather than 0: no indexed fee is an absence of information, and 0 gwei
 * would claim gas is free. Gwei is preferred over arune because 20 gwei is readable where
 * 20000000000 is not; arune is on the tooltip for anyone who needs the exact value.
 */
function gasLabel(caps: ReturnType<typeof useCapabilities>['data']): string {
  const gwei = caps?.gas?.base_fee_gwei;

  if (!gwei) return '—';

  return `${gwei} gwei`;
}

/**
 * Route wrapper that pulls :hash out of the path.
 *
 * Kept separate so TxDetailPage remains a pure component taking a `hash` prop, which
 * makes it easier to render in isolation.
 */
function TxDetailRoute() {
  const { hash } = useParams<{ hash: string }>();

  if (!hash) return <NotFound />;

  return <TxDetailPage hash={hash} />;
}

/** Route wrapper for /addresses/:addr — keeps AddressPage a pure prop-taking page. */
function AddressRoute() {
  const { addr } = useParams<{ addr: string }>();

  if (!addr) return <NotFound />;

  return <AddressPage addr={addr} />;
}

function NotFound() {
  return (
    <div className="state state--notfound">
      <strong>Page not found</strong>
      <span className="state__hint">
        Try <Link to="/blocks">blocks</Link> or <Link to="/txs">transactions</Link>.
      </span>
    </div>
  );
}

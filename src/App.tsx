import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom';

import { useCapabilities } from './hooks/queries';
import { groupDigits } from './lib/format';
import { SearchBox } from './components/SearchBox';
import { OverviewPage } from './pages/OverviewPage';
import { BlockListPage } from './pages/BlockListPage';
import { BlockDetailPage } from './pages/BlockDetailPage';
import { TxDetailPage, TxListPage } from './pages/TxPages';

export default function App() {
  const caps = useCapabilities();

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          Block<span>dium</span>
          {/* Development status. Deliberately small and unstyled-loud: it must be
              readable but must not compete with the explorer's own data. */}
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

        <SearchBox />

        <div className="stats">
          {caps.data ? (
            <>
              {/* Network name, not the chain-id: an operator reading the header wants
                  to know WHICH network, and rune_6592-1 means nothing at a glance. */}
              <span className="netname" title={caps.data.chain.chain_id}>
                Devnet
              </span>
              <span className="dot" aria-hidden="true">
                ·
              </span>
              <span>
                head <strong>{groupDigits(caps.data.indexer.last_indexed_height)}</strong>
              </span>
              {caps.data.indexer.lag_blocks > 5 && (
                <span className="status status--fail">lagging {caps.data.indexer.lag_blocks}</span>
              )}
            </>
          ) : (
            <span className="muted">connecting…</span>
          )}
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/blocks" element={<BlockListPage />} />
          <Route path="/blocks/:height" element={<BlockDetailPage />} />
          <Route path="/txs" element={<TxListPage />} />
          <Route path="/txs/:hash" element={<TxDetailRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="footer">
        <span>
          Blockdium · Hoodium Devnet{' '}
          <span className="mono" title="chain-id">
            rune_6592-1
          </span>
        </span>
        <span className="muted">Hoodium-only. Not a general-purpose EVM explorer.</span>
      </footer>
    </div>
  );
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

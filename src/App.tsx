import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom';

import { useCapabilities } from './hooks/queries';
import { AddNetworkButton } from './components/AddNetworkButton';
import { OverviewPage } from './pages/OverviewPage';
import { BlockListPage } from './pages/BlockListPage';
import { BlockDetailPage } from './pages/BlockDetailPage';
import { TxDetailPage, TxListPage } from './pages/TxPages';
import { AddressPage } from './pages/AddressPage';
import { PrivacyPage, TermsPage } from './pages/LegalPages';

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
            {/*
              The indexer health dot lives beside "Devnet" on the right of this row, not here:
              both answer the same question ("which chain, and is it current?"), so grouping
              them keeps the left side purely prices/gas.
            */}
          </div>

          <div className="topbar__right">
            {/* Dot first: it qualifies the name that follows, reading as "current · Devnet". */}
            {caps.data && <IndexerDot lag={caps.data.indexer.lag_blocks} />}
            <span className="netname" title={caps.data ? caps.data.chain.chain_id : undefined}>
              Devnet
            </span>
          </div>
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
            {/*
              Onward links sit to the LEFT of the wallet button, separated from it by a rule.
              Grouping them here keeps the wallet action at the far edge, where it is the last
              thing the eye reaches.
            */}
            <a
              className="topbar__link"
              href="https://join.hoodium.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join Now!
            </a>

            <a
              className="topbar__link"
              href="https://faucet.hoodium.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              Faucet
            </a>

            <span className="topbar__divider" aria-hidden="true" />

            <AddNetworkButton />
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
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__brand">
            <p className="footer__title">
              Block<span className="brand-accent">dium</span>
              <span className="footer__divider" aria-hidden="true">
                {' '}
                |{' '}
              </span>
              {/*
                External link: `target="_blank"` with `rel="noopener noreferrer"` because an
                untrusted destination must not get a handle on this window via window.opener.
              */}
              <a
                className="footer__powered"
                href="https://hoodium.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Powered by Hoodium
              </a>
            </p>
            <span className="muted">
              The Hoodium block explorer, built around Proof of Network Activity — the reward a
              block earns depends on how many regular transactions it carried.
            </span>
          </div>

          <div className="footer__meta">
            {/*
              Chain id removed from the visible line: "Hoodium Devnet" is what a reader needs,
              and rune_6592-1 is noise at a glance. It stays in the header's `title` (hover on
              "Devnet") and in the Chain status drawer for anyone who needs the technical id.
            */}
            <span>Hoodium Devnet</span>
            <span className="muted">Hoodium-only. Not a general-purpose EVM explorer.</span>
            <span className="muted">
              Built by{' '}
              <a className="inline-link" href="https://evorz.com" target="_blank" rel="noopener noreferrer">
                Evorz Labs
              </a>{' '}
              &amp; the Hoodium Team
            </span>
          </div>
        </div>

        {/* Row above the legal bar: social links left, Back to top right. */}
        <div className="footer__bar">
          <div className="footer__bar-inner">
            <SocialLinks />

            <button
              type="button"
              className="totop"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to Top
              <span className="totop__arrow" aria-hidden="true">
                ↑
              </span>
            </button>
          </div>
        </div>

        {/*
          Copyright bar, visually separated from the descriptive block above so it reads as
          the legal footer rather than more marketing copy.
        */}
        <div className="footer__legal">
          <div className="footer__legal-inner">
            <span className="muted">
              © {new Date().getFullYear()} Hoodium Network - by{' '}
              <a className="inline-link" href="https://hoodinals.io" target="_blank" rel="noopener noreferrer">
                Hoodinals
              </a>
              . All rights reserved.
            </span>

            <nav className="footer__links" aria-label="Legal">
              <Link to="/terms">Terms of Service</Link>
              <span className="footer__links-sep" aria-hidden="true">
                ·
              </span>
              <Link to="/privacy">Privacy Policy</Link>
            </nav>
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

/**
 * Indexer health dot.
 *
 * Three states rather than two: "current" (lag 0), "settling" (1–5 blocks, normal during a
 * burst of blocks) and "behind" (>5). Collapsing the middle band into green would hide a
 * genuine stall; collapsing it into red would cry wolf on ordinary block-time jitter.
 *
 * The tooltip and `aria-label` carry the exact lag, because colour alone is not accessible
 * and the whole point of a dot is that it says nothing on screen until you ask.
 */
function IndexerDot({ lag }: { lag: number }) {
  const state = lag === 0 ? 'current' : lag > 5 ? 'behind' : 'settling';

  const label =
    lag === 0
      ? 'Indexer is current with the chain head'
      : `Indexer is ${lag} block${lag === 1 ? '' : 's'} behind the chain head`;

  return (
    <span className="ticker__item ticker__item--health" title={label}>
      <span className={`healthdot healthdot--${state}`} role="img" aria-label={label} />
    </span>
  );
}

/**
 * Social links.
 *
 * Placeholders on purpose: the real account URLs are not known to me, so `href="#"` with an
 * explicit TODO keeps them obviously unfinished rather than pointing at a guessed handle.
 * Each has an accessible name because the icon alone carries no text.
 */
function SocialLinks() {
  const links = [
    { key: 'x', label: 'X', title: 'X (Twitter) — TODO: real URL' },
    { key: 'linkedin', label: 'LinkedIn', title: 'LinkedIn — TODO: real URL' },
  ];

  return (
    <nav className="socials" aria-label="Social media">
      {links.map((l) => (
        <a
          key={l.key}
          className={`socials__link socials__link--${l.key}`}
          href="#"
          title={l.title}
          aria-label={l.label}
        >
          {l.key === 'x' && <XIcon />}
          {l.key === 'linkedin' && <LinkedInIcon />}
        </a>
      ))}
    </nav>
  );
}

/** Inline brand marks: external assets would 404 in a public repo. */
function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.3l7.3-8.3L1.1 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.05a4.2 4.2 0 013.75-2c4 0 4.4 2.5 4.4 5.8V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21h-4V9z" />
    </svg>
  );
}


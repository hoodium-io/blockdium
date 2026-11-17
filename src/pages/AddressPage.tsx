import { Link } from 'react-router-dom';

import { useAddress } from '../hooks/queries';
import { DASH, groupDigits, shortHash } from '../lib/format';
import { StateGate } from '../components/StateGate';
import { TransfersSection, TxsSection } from './AddressSections';

/**
 * Address page.
 *
 * One page serves both a wallet and a contract, because on this chain they are the
 * same 20 bytes — the difference is only whether code is deployed there. The badge
 * says which, and the transfers table explains the relationship: a token contract
 * shows the transfers IT emitted, while a wallet shows transfers it took part in.
 */
export function AddressPage({ addr }: { addr: string }) {
  const summary = useAddress(addr);

  return (
    <section>
      <nav className="breadcrumb">
        <Link to="/blocks">Blocks</Link> <span aria-hidden="true">/</span>{' '}
        <span className="mono">{shortHash(addr, 16, 8)}</span>
      </nav>

      <StateGate
        isLoading={summary.isLoading}
        error={summary.error}
        data={summary.data}
        notFoundMessage="This address has no indexed activity."
      >
        {(s) => (
          <>
            <h1 className="addrhead">
              Address
              <span className={`pill pill--${s.kind === 'contract' ? 'evm' : 'plain'}`}>
                {s.kind.toUpperCase()}
              </span>
            </h1>

            <dl className="facts">
              <Fact label="Bech32" value={s.bech32 || DASH} mono copyable />
              <Fact label="Hex (EVM)" value={s.hex} mono copyable />
              <Fact
                label="Transactions"
                value={groupDigits(s.tx_count)}
                hint={s.tx_count === 0 ? 'No indexed activity for this address' : undefined}
              />
              <Fact
                label="First seen"
                value={s.first_seen_height === null ? DASH : groupDigits(s.first_seen_height)}
                hint={s.first_seen_height === null ? 'No activity in indexed history' : undefined}
              />
              <Fact
                label="Last seen"
                value={s.last_seen_height === null ? DASH : groupDigits(s.last_seen_height)}
              />
            </dl>

            <TransfersSection addr={addr} />
            <TxsSection addr={addr} />
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


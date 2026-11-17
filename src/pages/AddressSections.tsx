import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { AddressTransfer, AddressTx } from '../api/types';
import { useAddressTransfers, useAddressTxs } from '../hooks/queries';
import { groupDigits, shortHash, statusLabel } from '../lib/format';
import { StateGate } from '../components/StateGate';
import { Pager } from '../components/Pager';

/**
 * ERC-20 transfers, paginated.
 *
 * The token column is always shown: one address can take part in transfers of several
 * tokens, and hiding which token a row belongs to would make the amount meaningless
 * (1000 of what?).
 */
export function TransfersSection({ addr }: { addr: string }) {
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const q = useAddressTransfers(addr, cursor);

  return (
    <div className="card">
      <h2>ERC-20 transfers</h2>

      <StateGate
        isLoading={q.isLoading}
        error={q.error}
        data={q.data}
        isEmpty={(d) => d.transfers.length === 0}
        emptyMessage="No ERC-20 transfers involving this address in indexed history."
      >
        {(d) => (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Height</th>
                  <th scope="col">Token</th>
                  <th scope="col">From</th>
                  <th scope="col">To</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                  <th scope="col">Tx</th>
                </tr>
              </thead>
              <tbody>
                {d.transfers.map((t) => (
                  <TransferRow key={`${t.tx_hash}-${t.log_index}`} t={t} self={addr} />
                ))}
              </tbody>
            </table>

            <Pager
              nextCursor={d.next_before_height}
              onCursor={setCursor}
              atFirstPage={cursor === undefined}
            />
          </>
        )}
      </StateGate>
    </div>
  );
}

function TransferRow({ t, self }: { t: AddressTransfer; self: string }) {
  const isOut = t.direction === 'out';

  return (
    <tr>
      <td>
        <Link to={`/blocks/${t.height}`}>{groupDigits(t.height)}</Link>
      </td>
      <td className="mono">
        <Link to={`/addresses/${t.token}`}>{shortHash(t.token, 10, 6)}</Link>
      </td>
      <td className={isOut ? 'mono dim' : 'mono'}>
        <AddrLink a={t.from} self={self} />
      </td>
      <td className={isOut ? 'mono' : 'mono dim'}>
        <AddrLink a={t.to} self={self} />
      </td>
      <td className="num" title={`${t.amount} base units`}>
        {t.amount_display.rune}
      </td>
      <td className="mono">
        <Link to={`/txs/${t.tx_hash}`}>{shortHash(t.tx_hash)}</Link>
      </td>
    </tr>
  );
}

function AddrLink({ a, self }: { a: string; self: string }) {
  const isSelf = a.toLowerCase() === self.toLowerCase();

  return (
    <Link to={`/addresses/${a}`} className={isSelf ? 'is-self' : undefined}>
      {shortHash(a, 10, 6)}
    </Link>
  );
}

/** Transactions touching the address, paginated. */
export function TxsSection({ addr }: { addr: string }) {
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const q = useAddressTxs(addr, cursor);

  return (
    <div className="card">
      <h2>Transactions</h2>

      <StateGate
        isLoading={q.isLoading}
        error={q.error}
        data={q.data}
        isEmpty={(d) => d.txs.length === 0}
        emptyMessage="No transactions involving this address in indexed history."
      >
        {(d) => (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Tx</th>
                  <th scope="col">Height</th>
                  <th scope="col">Type</th>
                  <th scope="col">Direction</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.txs.map((t: AddressTx) => (
                  <tr key={t.hash}>
                    <td className="mono">
                      <Link to={`/txs/${t.hash}`}>{shortHash(t.hash)}</Link>
                    </td>
                    <td>
                      <Link to={`/blocks/${t.height}`}>{groupDigits(t.height)}</Link>
                    </td>
                    <td>
                      <span className={`pill pill--${t.tx_type}`}>{t.tx_type.toUpperCase()}</span>
                    </td>
                    <td>
                      <span className={`dir dir--${t.direction}`}>{t.direction}</span>
                    </td>
                    <td>
                      <span className={`status status--${t.status === 1 ? 'ok' : 'fail'}`}>
                        {statusLabel(t.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pager
              nextCursor={d.next_before_height}
              onCursor={setCursor}
              atFirstPage={cursor === undefined}
            />
          </>
        )}
      </StateGate>
    </div>
  );
}

import { Link } from 'react-router-dom';

import { useTx, useTxs } from '../hooks/queries';
import { DASH, formatAmount, groupDigits, shortHash, statusLabel } from '../lib/format';
import { StateGate } from '../components/StateGate';

export function TxListPage() {
  const query = useTxs({ limit: 25 });

  return (
    <section>
      <h1>Transactions</h1>

      <StateGate
        isLoading={query.isLoading}
        error={query.error}
        data={query.data}
        emptyMessage="No transactions indexed yet."
      >
        {(d) => (
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Hash</th>
                <th scope="col">Type</th>
                <th scope="col">Block</th>
                <th scope="col">Status</th>
                <th scope="col">Sender</th>
                <th scope="col" className="num">
                  Fee
                </th>
              </tr>
            </thead>
            <tbody>
              {d.txs.map((t) => (
                <tr key={t.hash}>
                  <td className="mono">
                    <Link to={`/txs/${t.hash}`}>{shortHash(t.hash)}</Link>
                  </td>
                  <td>
                    <span className={`pill pill--${t.tx_type}`}>{t.tx_type.toUpperCase()}</span>
                  </td>
                  <td>
                    <Link to={`/blocks/${t.height}`}>{groupDigits(t.height)}</Link>
                  </td>
                  <td>
                    <span className={`status status--${t.status === 1 ? 'ok' : 'fail'}`}>
                      {statusLabel(t.status)}
                    </span>
                  </td>
                  <td className="mono muted">{t.sender ? shortHash(t.sender, 12, 6) : DASH}</td>
                  <td className="num">{formatAmount(t.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </StateGate>
    </section>
  );
}

export function TxDetailPage({ hash }: { hash: string }) {
  const query = useTx(hash);

  return (
    <section>
      <nav className="breadcrumb">
        <Link to="/txs">Transactions</Link> <span aria-hidden="true">/</span>{' '}
        <span className="mono">{shortHash(hash)}</span>
      </nav>

      <h1>Transaction</h1>

      <StateGate
        isLoading={query.isLoading}
        error={query.error}
        data={query.data}
        notFoundMessage="This transaction hash is not indexed."
      >
        {(t) => (
          <dl className="facts">
            <Row label="Cosmos hash" value={t.hash} mono />
            <Row
              label="EVM hash"
              value={t.eth_hash ?? DASH}
              hint={t.eth_hash === null ? 'Not an EVM transaction' : undefined}
              mono
            />
            <Row label="Block" value={<Link to={`/blocks/${t.height}`}>{groupDigits(t.height)}</Link>} />
            <Row label="Index in block" value={String(t.tx_index)} />
            <Row label="Type" value={<span className={`pill pill--${t.tx_type}`}>{t.tx_type.toUpperCase()}</span>} />
            <Row
              label="Status"
              value={
                <span className={`status status--${t.status === 1 ? 'ok' : 'fail'}`}>
                  {statusLabel(t.status)}
                </span>
              }
            />
            {t.error_message && <Row label="Error" value={t.error_message} />}
            <Row label="Sender" value={t.sender ?? DASH} mono />
            <Row
              label="EVM from"
              value={t.evm_from ?? DASH}
              hint={t.evm_from === null ? 'Not decoded: the event carries no sender' : undefined}
              mono
            />
            <Row
              label="EVM to"
              value={t.evm_to ?? DASH}
              hint={t.evm_to === null ? 'Null on contract creation' : undefined}
              mono
            />
            <Row label="Value" value={formatAmount(t.value)} />
            <Row label="Fee" value={formatAmount(t.fee)} />
            <Row label="Gas used / wanted" value={`${groupDigits(t.gas_used)} / ${groupDigits(t.gas_wanted)}`} />
          </dl>
        )}
      </StateGate>
    </section>
  );
}

function Row({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined} title={hint}>
        {value}
        {hint && <span className="figure__hint"> {hint}</span>}
      </dd>
    </>
  );
}

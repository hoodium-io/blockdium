import { useState } from 'react';

import { MetaMaskLogo } from './MetaMaskLogo';
import { addDevnetToWallet, evmRpcUrl, type AddChainResult } from '../lib/metamask';

/**
 * "Add Mainchain Devnet" button.
 *
 * Behaviour is deliberately explicit rather than silent: every outcome of the wallet
 * call is reported, because a wallet button that appears to do nothing is
 * indistinguishable from a broken one.
 *
 * The RPC URL is shown in the tooltip. MetaMask stores it permanently in the user's
 * wallet, so a visitor should be able to see what they are about to add — and an
 * operator running the node on loopback needs to know that URL will not work for
 * anyone else.
 */
export function AddNetworkButton() {
  const [result, setResult] = useState<AddChainResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    setResult(null);

    try {
      setResult(await addDevnetToWallet());
    } finally {
      setBusy(false);
    }
  }

  const label = busy ? 'Adding…' : 'Add Mainchain Devnet';

  return (
    <div className="addnet">
      <button
        type="button"
        className="addnet__btn"
        onClick={onClick}
        disabled={busy}
        title={`Add Hoodium Devnet (chain id 6592) to your wallet\nRPC: ${evmRpcUrl()}`}
      >
        <MetaMaskLogo />
        <span>{label}</span>
      </button>

      {result && <AddNetworkMessage result={result} onDismiss={() => setResult(null)} />}
    </div>
  );
}

function AddNetworkMessage({
  result,
  onDismiss,
}: {
  result: AddChainResult;
  onDismiss: () => void;
}) {
  const { tone, text } = describe(result);

  return (
    <div className={`addnet__msg addnet__msg--${tone}`} role="status">
      <span>{text}</span>
      <button type="button" className="addnet__close" onClick={onDismiss} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

/**
 * Map an outcome to a tone and a sentence.
 *
 * Each case says what actually happened. "No wallet detected" is kept distinct from an
 * error because the fix is completely different: install MetaMask versus retry.
 */
function describe(result: AddChainResult): { tone: 'ok' | 'warn' | 'error'; text: string } {
  switch (result.status) {
    case 'added':
      return { tone: 'ok', text: 'Devnet added to your wallet.' };

    case 'already-added':
      return { tone: 'ok', text: 'Devnet is already in your wallet.' };

    case 'rejected':
      return { tone: 'warn', text: 'Request cancelled in your wallet.' };

    case 'no-wallet':
      return {
        tone: 'warn',
        text: 'No browser wallet detected. Install MetaMask to add Devnet.',
      };

    case 'error':
      return { tone: 'error', text: `Could not add the network: ${result.message}` };
  }
}

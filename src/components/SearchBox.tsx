import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * What the search box decided an input refers to.
 *
 * The shape of the input is the only information available client-side, so the
 * classification is deliberately conservative: anything ambiguous is reported rather
 * than guessed, because a wrong guess navigates the user to a page that says "not
 * found" and looks like a bug in the explorer.
 */
type Parsed =
  | { kind: 'height'; height: number }
  | { kind: 'cosmos-hash'; hash: string }
  | { kind: 'evm-hash'; hash: string }
  | { kind: 'address'; address: string }
  | { kind: 'invalid'; reason: string };

const HEX_HASH = /^0x[0-9a-fA-F]{64}$/;
const BARE_HASH = /^[0-9a-fA-F]{64}$/;
const BECH32_ADDRESS = /^(rune|runevaloper|runevalcons)1[0-9a-z]{38,60}$/;

/**
 * Classify a search input.
 *
 * Exported so the rules can be tested and reviewed in one place:
 *
 *  - all digits            → block height
 *  - 0x + 64 hex           → a hash; could be a tx OR a block hash, and the API has
 *                            no "resolve either" route yet, so it goes to /txs/ and
 *                            the tx page's 404 explains itself
 *  - 64 hex without 0x     → CometBFT-style tx hash; normalised to 0x
 *  - bech32 address        → address page (not implemented yet)
 *  - anything else         → invalid, with the reason shown
 */
export function parseSearch(input: string): Parsed {
  const q = input.trim();

  if (q === '') {
    return { kind: 'invalid', reason: 'Enter a block height, hash or address.' };
  }

  if (/^[0-9]+$/.test(q)) {
    const height = Number(q);

    if (!Number.isSafeInteger(height) || height < 1) {
      return { kind: 'invalid', reason: 'Block heights start at 1.' };
    }

    return { kind: 'height', height };
  }

  if (HEX_HASH.test(q)) {
    return { kind: 'evm-hash', hash: q.toLowerCase() };
  }

  if (BARE_HASH.test(q)) {
    // CometBFT reports hashes without the 0x prefix; the API accepts both, so
    // normalising here keeps the URL canonical.
    return { kind: 'cosmos-hash', hash: `0x${q.toLowerCase()}` };
  }

  if (BECH32_ADDRESS.test(q)) {
    return { kind: 'address', address: q };
  }

  return {
    kind: 'invalid',
    reason: 'Unrecognised input. Expected a block height, a 64-character hash, or a rune1… address.',
  };
}

/**
 * Header search box.
 *
 * Submitting navigates rather than fetching: every destination is already a route
 * with its own loading and not-found handling, so duplicating that here would create
 * two places to keep correct.
 */
export function SearchBox() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();

    const parsed = parseSearch(value);

    switch (parsed.kind) {
      case 'height':
        setError(null);
        navigate(`/blocks/${parsed.height}`);

        break;

      case 'evm-hash':
      case 'cosmos-hash':
        setError(null);
        navigate(`/txs/${parsed.hash}`);

        break;

      case 'address':
        // The address route does not exist yet. Saying so is better than navigating
        // to a 404 that looks like the address itself was wrong.
        setError('Address pages are not available yet.');

        break;

      case 'invalid':
        setError(parsed.reason);

        break;
    }
  }

  return (
    <div className="search">
      <form onSubmit={submit} role="search">
        <input
          type="search"
          className="search__input"
          placeholder="Height, hash or address…"
          aria-label="Search by block height, hash or address"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
        />
        <button type="submit" className="search__btn">
          Search
        </button>
      </form>
      {error && (
        <p className="search__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

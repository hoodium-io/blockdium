import { useId, useState, type FormEvent } from 'react';
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

  | { kind: 'hash'; hash: string }
  | { kind: 'address'; address: string }
  | { kind: 'invalid'; reason: string };

const HEX_HASH = /^0x[0-9a-fA-F]{64}$/;
const BARE_HASH = /^[0-9a-fA-F]{64}$/;
const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BARE_ADDRESS = /^[0-9a-fA-F]{40}$/;
const BECH32_ADDRESS = /^(rune|runevaloper|runevalcons)1[0-9a-z]{38,60}$/;

/**
 * Classify a search input.
 *
 * Exported so the rules can be tested and reviewed in one place. Length is what
 * disambiguates: 64 hex characters can only be a hash, 40 can only be an address, so
 * there is no genuine ambiguity to guess at.
 *
 *  - all digits              → block height
 *  - 0x + 64 hex             → a hash (tx or block; /txs/ reports which if wrong)
 *  - 0x + 40 hex             → an address (the EVM form)
 *  - 64 hex, no 0x           → CometBFT-style tx hash; normalised to 0x
 *  - 40 hex, no 0x           → address; normalised to 0x
 *  - bech32 address          → address page
 *  - anything else           → invalid, with the reason shown
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
    return { kind: 'hash', hash: q.toLowerCase() };
  }

  if (BARE_HASH.test(q)) {
    // CometBFT reports hashes without the 0x prefix; the API accepts both, so
    // normalising here keeps the URL canonical.
    return { kind: 'hash', hash: `0x${q.toLowerCase()}` };
  }

  if (HEX_ADDRESS.test(q)) {
    return { kind: 'address', address: q.toLowerCase() };
  }

  if (BARE_ADDRESS.test(q)) {
    return { kind: 'address', address: `0x${q.toLowerCase()}` };
  }

  if (BECH32_ADDRESS.test(q)) {
    // Validator addresses parse here but the API rejects them with an explanation,
    // which is more useful than silently refusing to navigate.
    return { kind: 'address', address: q };
  }

  return {
    kind: 'invalid',
    reason:
      'Unrecognised input. Expected a block height, a 64-character hash, or a 40-character / rune1… address.',
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
  // Scope starts at "all" so the box behaves as before until the reader narrows it.
  const [scope, setScope] = useState<SearchScope>('all');

  function submit(e: FormEvent) {
    e.preventDefault();

    const parsed = parseSearch(value);

    switch (parsed.kind) {
      case 'height':
        setError(null);
        navigate(`/blocks/${parsed.height}`);

        break;

      case 'hash':
        setError(null);
        navigate(`/txs/${parsed.hash}`);

        break;

      case 'address':
        // The address route now exists, and accepts bech32 or hex, so either form of
        // a pasted address resolves to the same page.
        setError(null);
        navigate(`/addresses/${parsed.address}`);

        break;

      case 'invalid':
        setError(parsed.reason);

        break;
    }
  }

  /**
   * Whether the parsed result matches the active scope.
   *
   * The scope is a real constraint, not decoration: with "Blocks" selected, pasting a hash
   * reports that it is not a block rather than silently navigating to a transaction page.
   * Guessing here would send the user somewhere they did not ask for.
   */
  function inScope(p: Parsed): boolean {
    switch (scope) {
      case 'all':
        return true;
      case 'blocks':
        return p.kind === 'height';
      case 'txs':
        return p.kind === 'hash';
      case 'addresses':
        return p.kind === 'address';
      default:
        return true;
    }
  }

  return (
    <div className="search">
      <form
        onSubmit={(e) => {
          e.preventDefault();

          const parsed = parseSearch(value);

          if (parsed.kind !== 'invalid' && !inScope(parsed)) {
            setError(`That does not look like ${scopeLabel(scope)}. Change the filter or the input.`);

            return;
          }

          submit(e);
        }}
        role="search"
      >
        <input
          type="search"
          className="search__input"
          placeholder="Search by Address (0x.., rune1..) / TxHash / Block"
          aria-label="Search by address, transaction hash, or block height"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
        />

        <button type="submit" className="search__btn">
          Search
        </button>

        <ScopeFilter scope={scope} onChange={setScope} />
      </form>

      {error && (
        <p className="search__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** The searchable result kinds, used both for filtering and for its labels. */
export type SearchScope = 'all' | 'blocks' | 'txs' | 'addresses';

function scopeLabel(scope: SearchScope): string {
  switch (scope) {
    case 'blocks':
      return 'a block height';
    case 'txs':
      return 'a transaction hash';
    case 'addresses':
      return 'an address';
    default:
      return 'a search term';
  }
}

const SCOPES: { key: SearchScope; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'blocks', label: 'Blocks' },
  { key: 'txs', label: 'Transactions' },
  { key: 'addresses', label: 'Addresses' },
];

/**
 * Scope selector, labelled "All Filters".
 *
 * A dropdown rather than a row of toggles: the search input already sits inline with the
 * submit button, and three more buttons beside it would crowd the hero. The current
 * selection is shown on the trigger so the reader never has to open it to know the state.
 */
function ScopeFilter({
  scope,
  onChange,
}: {
  scope: SearchScope;
  onChange: (s: SearchScope) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  const current = SCOPES.find((s) => s.key === scope) ?? SCOPES[0];

  return (
    <div className="scopefilter">
      <button
        type="button"
        className={`scopefilter__btn${scope !== 'all' ? ' is-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        title="Limit what the search looks for"
      >
        {scope === 'all' ? 'All Filters' : current.label}
        <span className="scopefilter__caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <>
          {/* Click-away layer: a dropdown that only closes via its own trigger feels stuck. */}
          <button
            type="button"
            className="scopefilter__scrim"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <ul className="scopefilter__menu" id={id}>
            {SCOPES.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  className={`scopefilter__item${s.key === scope ? ' is-selected' : ''}`}
                  onClick={() => {
                    onChange(s.key);
                    setOpen(false);
                  }}
                >
                  {s.label}
                  {s.key === scope && (
                    <span className="scopefilter__check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

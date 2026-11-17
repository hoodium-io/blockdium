/**
 * Keyset pagination control.
 *
 * The API pages by `before_height` rather than offset, because blocks are appended
 * continuously — an OFFSET would silently skip or repeat rows while the user pages.
 * That makes the cursor opaque to this component: it only passes through the value the
 * API returned.
 *
 * Both directions are offered: "First page" exists because a user several pages deep
 * into an address's history has no other cheap way back, and a browser Back press
 * alone is unreliable when the cursor lives in component state rather than the URL.
 */
export function Pager({
  nextCursor,
  onCursor,
  atFirstPage,
}: {
  nextCursor: number | null;
  onCursor: (cursor: number | undefined) => void;
  atFirstPage: boolean;
}) {
  // Nothing to show when the first page is also the last page.
  if (nextCursor === null && atFirstPage) return null;

  return (
    <nav className="pager" aria-label="Pagination">
      <button
        type="button"
        className="btn"
        onClick={() => onCursor(undefined)}
        disabled={atFirstPage}
      >
        ← First page
      </button>

      <button
        type="button"
        className="btn"
        onClick={() => nextCursor !== null && onCursor(nextCursor)}
        disabled={nextCursor === null}
      >
        Older →
      </button>

      {nextCursor !== null && (
        <span className="pager__hint muted">older than height {nextCursor.toLocaleString()}</span>
      )}
    </nav>
  );
}

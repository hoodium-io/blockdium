import { useEffect, useId, useState, type ReactNode } from 'react';

/**
 * A side drawer with a vertically-written label that toggles on click.
 *
 * # Why a custom component rather than `<dialog>` or a library
 *
 * The drawer must coexist with the page content rather than overlay it: opening the
 * ladder should not hide the band chart behind a scrim. So this is a push-style panel
 * anchored to the viewport edge, not a modal.
 *
 * # Accessibility
 *
 * The label is rotated with `writing-mode`, so it is still real text a screen reader
 * announces. The toggle is a `<button>` with `aria-expanded` and `aria-controls`, and
 * Escape closes it. Rotation is purely visual (`transform`), so focus order and text
 * selection are unaffected.
 */
export interface DrawerProps {
  /** Side of the viewport the drawer docks to. */
  side: 'left' | 'right';
  /** Vertically-written label shown on the collapsed tab. */
  label: string;
  /** Content rendered inside the drawer when open. */
  children: ReactNode;
  /** Whether the drawer starts open. Both default closed so the page loads uncluttered. */
  defaultOpen?: boolean;
  /** Short line under the panel title when open; explains what the reader is seeing. */
  subtitle?: string;
}

export function Drawer({ side, label, children, defaultOpen = false, subtitle }: DrawerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  // Escape closes the drawer, but only when it is open — a global listener that acts on a
  // closed drawer would swallow the key for the rest of the page.
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={`drawer drawer--${side}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="drawer__tab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        title={open ? `Hide ${label}` : `Show ${label}`}
      >
        <span className="drawer__tablabel">{label}</span>
        <span className="drawer__chevron" aria-hidden="true">
          {chevronFor(side, open)}
        </span>
      </button>

      {open && (
        <div className="drawer__panel" id={panelId}>
          <header className="drawer__head">
            <h2>{label}</h2>
            <button
              type="button"
              className="drawer__close"
              onClick={() => setOpen(false)}
              aria-label={`Close ${label}`}
            >
              ×
            </button>
          </header>
          {subtitle && <p className="drawer__subtitle muted">{subtitle}</p>}
          <div className="drawer__body">{children}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Chevron direction that means "this will move outward".
 *
 * A left drawer opens leftwards, so the collapsed indicator points left; the same logic
 * mirrored for the right side. It is a visual affordance only — the label and
 * `aria-expanded` carry the meaning.
 */
function chevronFor(side: 'left' | 'right', open: boolean): string {
  if (side === 'left') return open ? '‹' : '›';

  return open ? '›' : '‹';
}

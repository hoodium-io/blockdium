import type { ReactNode } from 'react';

import { ApiError } from '../api/client';

/**
 * Renders the three non-data states consistently.
 *
 * Having one gate is deliberate: this API distinguishes "not found" from "failed"
 * (404 vs 500), and burying that distinction in six separate pages is how a UI ends
 * up telling the user "something went wrong" when the honest answer is "that block
 * has not been indexed yet".
 */
interface Props<T> {
  isLoading: boolean;
  error: unknown;
  data: T | undefined;
  /** Message for a 404, which is a normal answer rather than a failure. */
  notFoundMessage?: string;
  /** Rendered when data is present but "empty" by the caller's definition. */
  isEmpty?: (data: T) => boolean;
  emptyMessage?: string;
  children: (data: T) => ReactNode;
}

export function StateGate<T>({
  isLoading,
  error,
  data,
  notFoundMessage = 'Not found.',
  isEmpty,
  emptyMessage = 'Nothing here yet.',
  children,
}: Props<T>) {
  if (isLoading) {
    return (
      <div className="state state--loading" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} notFoundMessage={notFoundMessage} />;
  }

  if (data === undefined) {
    return <div className="state state--loading">Loading…</div>;
  }

  if (isEmpty?.(data)) {
    return <div className="state state--empty">{emptyMessage}</div>;
  }

  return <>{children(data)}</>;
}

export function ErrorState({
  error,
  notFoundMessage,
}: {
  error: unknown;
  notFoundMessage: string;
}) {
  if (error instanceof ApiError) {
    if (error.isNotFound) {
      return <div className="state state--notfound">{notFoundMessage}</div>;
    }

    return (
      <div className="state state--error" role="alert">
        <strong>{error.message}</strong>
        <span className="state__hint">
          {error.code}
          {error.status >= 500
            ? ' — the API could not answer. Check that the backend is running.'
            : ''}
        </span>
      </div>
    );
  }

  // Network-level failure (fetch rejected): the backend is probably down.
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div className="state state--error" role="alert">
      <strong>Cannot reach the API</strong>
      <span className="state__hint">{message}</span>
      <span className="state__hint">
        Is the backend running? <code>make serve</code>
      </span>
    </div>
  );
}

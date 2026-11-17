import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import './index.css';

/**
 * Query client tuned for a chain explorer.
 *
 * `retry` is conditional: a 404 from this API is a definitive answer ("that block is
 * not indexed"), so retrying it three times only delays the message. Network and 5xx
 * failures DO retry, because a restarted backend recovers on its own.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { status?: number } | null)?.status;

        if (status === 404 || status === 400) return false;

        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);


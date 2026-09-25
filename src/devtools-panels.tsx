import { useContext } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

// Loaded only by devtools.tsx in development. The Query panel appears once the app provides a
// QueryClient; the Router panel reads the router from context.
export default function DevtoolsPanels() {
  const queryClient = useContext(QueryClientContext);
  return <>
    <TanStackRouterDevtools position="bottom-left" />
    {queryClient && <ReactQueryDevtools client={queryClient} buttonPosition="bottom-right" />}
  </>;
}

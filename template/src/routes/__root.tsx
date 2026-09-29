import { createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { remyRoot, type RemyRouterContext } from '@joeblew999/remy-ui/root';
import { remyApp } from '../remy-app';
import '../styles.css';

// TanStack Devtools stay in this file: its Vite plugin strips them from production builds only here.
export const Route = createRootRouteWithContext<RemyRouterContext>()(remyRoot(remyApp, {
  devtools: <TanStackDevtools plugins={[
    { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
    { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
  ]} />,
}));

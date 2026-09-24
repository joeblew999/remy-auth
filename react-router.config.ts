import type { Config } from '@react-router/dev/config';
export default {
  ssr: true,
  routeDiscovery: { mode: 'initial' },
  // Keep clientLoader.hydrate and HydrateFallback together. With the pinned
  // router's split modules, production hydration skips the demo fallback.
  // The production browser suite guards this until splitting can be re-enabled.
  splitRouteModules: false,
} satisfies Config;

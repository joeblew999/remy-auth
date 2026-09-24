import { index, route, type RouteConfig } from '@react-router/dev/routes';
import { publicPaths } from './paths';
export default [
  index('routes/choose.tsx'),
  // A public path without a locale shows the language chooser; ':locale' would otherwise capture it.
  ...publicPaths.filter(Boolean).map(path => route(path.slice(1), 'routes/unprefixed.tsx', { id: `choose${path}` })),
  route(':locale', 'routes/home.tsx'),
  route(':locale/demo', 'routes/demo.tsx'),
  route(':locale/formats', 'routes/formats.tsx'),
  route('robots.txt', 'routes/robots.ts'),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;

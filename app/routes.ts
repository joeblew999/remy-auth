import { index, route, type RouteConfig } from '@react-router/dev/routes';
import { publicPaths } from './paths';
export default [
  index('routes/redirect.ts'),
  // Public paths without a locale redirect too; ':locale' would otherwise capture them.
  ...publicPaths.filter(Boolean).map(path => route(path.slice(1), 'routes/redirect.ts', { id: `redirect${path}` })),
  route(':locale', 'routes/home.tsx'),
  route(':locale/demo', 'routes/demo.tsx'),
  route(':locale/formats', 'routes/formats.tsx'),
  route('robots.txt', 'routes/robots.ts'),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;

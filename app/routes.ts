import { index, route, type RouteConfig } from '@react-router/dev/routes';
export default [
  index('routes/redirect.ts'),
  route(':locale', 'routes/home.tsx'),
  route(':locale/demo', 'routes/demo.tsx'),
  route('robots.txt', 'routes/robots.ts'),
  route('sitemap.xml', 'routes/sitemap.ts'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;

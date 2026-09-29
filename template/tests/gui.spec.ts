import { serverAppChecks } from '@joeblew999/remy-ui/app-checks';
import { partChecks } from '@joeblew999/remy-ui/parts/checks';
import { buildBoundaryChecks } from '@joeblew999/remy-ui/showcase/build-boundaries.checks';
import { service } from '../src/service';
import { sitePaths, appPaths } from '../src/paths';

// The shared checks every server-rendered app passes, and those of the parts src/parts.json lists (the
// sitemap and robots.txt: seo-routes); this app's own checks go beside them.
serverAppChecks({ service, sitePaths, appPaths });
partChecks({ options: { 'seo-routes': { paths: sitePaths } } });
// TanStack Devtools (src/routes/__root.tsx) never ship: its Vite plugin strips them from production builds.
buildBoundaryChecks({ paths: [...sitePaths, ...appPaths], markers: [
  { name: 'TanStack Devtools', pattern: /tsd-(?:control|surface)\b/, source: { package: '@tanstack/devtools', from: '@tanstack/react-devtools' } },
] });

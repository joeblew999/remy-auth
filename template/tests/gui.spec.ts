import { serverAppChecks } from '@joeblew999/remy-ui/app-checks';
import { partChecks } from '@joeblew999/remy-ui/parts/checks';
import { service } from '../src/service';
import { sitePaths, appPaths } from '../src/paths';

// The shared checks every server-rendered app passes, and those of the parts src/parts.json lists (the
// sitemap and robots.txt: seo-routes); this app's own checks go beside them.
serverAppChecks({ service, sitePaths, appPaths });
partChecks({ options: { 'seo-routes': { paths: sitePaths } } });

import { smokeChecks } from '@joeblew999/remy-ui/smoke';
import { appPagePaths, sitePaths } from '../src/paths';

// Tier 1, smoke (vp run test:browser --grep smoke): the package's smoke checks over this app's pages. The docs are
// the docs Worker's (docs:test).
smokeChecks({ sitePaths, appPaths: appPagePaths, hydrate: [''] });

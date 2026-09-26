import { smokeChecks } from '@joeblew999/remy-ui/smoke';
import { appPagePaths, sitePaths } from '../src/paths';

// Tier 1, smoke (mise project:test:smoke): the package's smoke checks over this app's pages. The docs are
// the docs Worker's (docs/tests).
smokeChecks({ sitePaths, appPaths: appPagePaths, hydrate: [''] });

import { smokeChecks } from '@joeblew999/remy-ui/smoke';
import { sitePaths, appPaths } from '../src/paths';

// Tier 1 (vp run test:browser --grep smoke), and the check after every deploy (npx remy test live).
smokeChecks({ sitePaths, appPaths, hydrate: [''] });

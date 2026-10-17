import { smokeChecks } from '@joeblew999/remy-ui/smoke';
import { sitePaths, appPaths } from '../src/paths';

// Tier 1 (npm run test -- smoke), and the check after every deploy (npm run test -- live).
smokeChecks({ sitePaths, appPaths, hydrate: [''] });

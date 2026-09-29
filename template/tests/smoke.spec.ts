import { smokeChecks } from '@joeblew999/remy-ui/smoke';
import { sitePaths, appPaths } from '../src/paths';

// Tier 1 (project:test:smoke), and the check after every cf:deploy (project:test:live).
smokeChecks({ sitePaths, appPaths, hydrate: [''] });

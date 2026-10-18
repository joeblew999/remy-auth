import { network } from './src/vite-plus.ts';
import { defineConfig } from 'vite-plus';

// What plain Node loads from an installed app (Vite configurations, Playwright's checks and what they share), by export
// name: built by vp pack into dist/, because Node and Playwright compile no TypeScript under node_modules.
// Everything else the package exports (components, routes, Worker code, CSS, the catalogs) is source the app's own Vite
// compiles, and stays in package.json as it is; customExports carries it over.
const packed = {
  'allowed.checks': 'src/allowed.checks.ts',
  'api/checks': 'src/api/checks.ts',
  'api/coverage': 'src/api/coverage.ts',
  'api/guard': 'src/api/guard.ts',
  'api/guard-core': 'src/api/guard-core.ts',
  'api/policy': 'src/api/policy.ts',
  'api/relations': 'src/api/relations.ts',
  'app-checks': 'src/app-checks.ts',
  'app/vite': 'src/app-vite.ts',
  'build-boundaries.checks': 'src/build-boundaries.checks.ts',
  'build.checks': 'src/build.checks.ts',
  'build/vite': 'src/build-vite.ts',
  checks: 'src/checks.ts',
  'code-splitting.checks': 'src/code-splitting.checks.ts',
  'docs/config': 'src/docs/config.ts',
  'docs/table-core': 'src/docs/docs/table-core.ts',
  'docs/vite': 'src/docs/vite.ts',
  environment: 'src/environment.ts',
  'locale-data': 'src/locale-data.ts',
  matching: 'src/matching.ts',
  parts: 'src/parts/list.ts',
  'parts/checks': 'src/parts/checks.ts',
  'parts/vite': 'src/parts/vite.ts',
  paths: 'src/paths.ts',
  playwright: 'src/playwright.ts',
  prerender: 'src/prerender.ts',
  'problem.checks': 'src/problem.checks.ts',
  samples: 'src/samples.ts',
  smoke: 'src/smoke.ts',
  'versions.checks': 'src/versions.checks.ts',
  'vite-plus': 'src/vite-plus.ts',
};

export default defineConfig({
  pack: {
    entry: packed,
    platform: 'node',
    // Declarations from tsconfig.pack.json: the workspace's TypeScript, narrowed to these files.
    tsconfig: 'tsconfig.pack.json',
    dts: true,
    // The package's own exports stay imports (the catalogs' one runtime, the source the app compiles).
    deps: { neverBundle: [/^@joeblew999\//] },
    exports: {
      devExports: true,
      // devExports: package.json's exports name the source, which remy-auth runs; publishConfig's name dist/.
      customExports: (generated, { pkg }) => ({
        ...Object.fromEntries(Object.entries(pkg.exports ?? {}).filter(([key]) => !(key.slice(2) in packed))),
        ...generated,
      }),
    },
  },
  run: {
    tasks: {
      generate: {
        command: 'node paraglide.mjs',
        cache: { input: [{ auto: true }, '!src/paraglide/**'], untrackedEnv: network },
      },
      pack: {
        command: 'vp pack',
        dependsOn: ['generate'],
        cache: { input: [{ auto: true }, '!dist/**', '!package.json', '!src/paraglide/**'], output: ['dist/**'] },
      },
    },
  },
});

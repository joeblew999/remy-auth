import { defineConfig } from 'vite-plus';

// What plain Node loads from an installed app (Playwright's checks, the paths they share), by export name: built by
// vp pack into dist/, because Node and Playwright compile no TypeScript under node_modules. Everything else the package
// exports (pages, routes, components, CSS) is source the app's own Vite compiles, and stays in package.json as it is.
const packed = {
  'device-place.checks': 'src/device-place.checks.ts',
  'navigation-blocking.checks': 'src/navigation-blocking.checks.ts',
  'parts/deferred-place/place.checks': 'src/parts/deferred-place/place.checks.ts',
  'parts/deferred-place/server-functions.checks': 'src/parts/deferred-place/server-functions.checks.ts',
  'parts/status-card/card.checks': 'src/parts/status-card/card.checks.ts',
  paths: 'src/paths.ts',
  'preload.checks': 'src/preload.checks.ts',
  'reservation.checks': 'src/reservation.checks.ts',
  'search-params.checks': 'src/search-params.checks.ts',
  'showcase.checks': 'src/showcase.checks.ts',
};

export default defineConfig({
  pack: {
    entry: packed,
    platform: 'node',
    // Declarations from tsconfig.pack.json: the workspace's TypeScript, narrowed to these files.
    tsconfig: 'tsconfig.pack.json',
    dts: true,
    // The platform's packages stay imports (the catalogs' one runtime).
    deps: { neverBundle: [/^@joeblew999\//] },
    exports: {
      // package.json's exports name the source, which remy-auth runs; publishConfig's name dist/.
      devExports: true,
      customExports: (generated, { pkg }) => ({
        ...Object.fromEntries(Object.entries(pkg.exports ?? {}).filter(([key]) => !(key.slice(2) in packed))),
        ...generated,
      }),
    },
  },
  run: {
    tasks: {
      pack: {
        command: 'vp pack',
        cache: { input: [{ auto: true }, '!dist/**', '!package.json'], output: ['dist/**'] },
      },
    },
  },
});

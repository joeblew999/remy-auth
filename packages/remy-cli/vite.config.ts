import { defineConfig } from 'vite-plus';

// The command line as an installed app runs it: dist/, built by vp pack (tsdown), because Node strips types from
// nothing under node_modules. devExports: package.json's bin names the source, which remy-auth runs; publishConfig's
// names dist/, which pnpm publishes in its place.
export default defineConfig({
  pack: {
    entry: ['src/remy.ts', 'src/checks.ts'],
    platform: 'node',
    dts: false,
    exports: { devExports: true, bin: { remy: './src/remy.ts', 'remy-check': './src/checks.ts' } },
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

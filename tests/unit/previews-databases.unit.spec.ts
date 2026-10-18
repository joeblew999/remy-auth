import { test, expect } from 'vite-plus/test';
import { createRequire } from 'node:module';

// The Previews' migrations are applied through previews.wrangler.jsonc (the app's deploy:preview script): the same
// databases, ids and migration folders as wrangler.jsonc's `previews` section, or a Preview would migrate another one.
test("previews.wrangler.jsonc names exactly the Previews' databases", () => {
  const { experimental_readRawConfig: read } = createRequire(import.meta.url)(
    createRequire(`${process.cwd()}/packages/remy-cli/package.json`).resolve('wrangler'),
  ) as { experimental_readRawConfig: (options: { config: string }) => { rawConfig: unknown } };
  const raw = (file: string) => read({ config: `apps/remy-auth/${file}` }).rawConfig as Record<string, any>;
  expect(raw('previews.wrangler.jsonc').d1_databases).toEqual(raw('wrangler.jsonc').previews.d1_databases);
});

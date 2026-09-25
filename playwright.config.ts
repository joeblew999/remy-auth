import { playwrightConfig } from '@joeblew999/remy-ui/playwright';

// Local runs serve the built Worker with Wrangler's --local: the AI Search binding (wrangler.jsonc) only
// ever runs remotely, and would otherwise need a Cloudflare login to start at all. Locally it is
// switched off, so the answer page takes its "no answer" path and no check costs a model call; answers
// are checked against a deployed target (project:test:remote).
export default playwrightConfig({ webServer: `./node_modules/.bin/wrangler dev --local --ip 127.0.0.1 --port ${process.env.PREVIEW_PORT ?? '4173'}` });

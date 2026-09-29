// What an app's Ask AI needs on Cloudflare, from docs.config.ts's `ask`, as the commands that create it
// (docs:provision). Creates nothing: the resources cost money and creating them is the owner's.
import { pathToFileURL } from 'node:url';

const { docsConfig } = await import(pathToFileURL(`${process.cwd()}/docs.config.ts`).href);
const { ask, service } = docsConfig;
if (!ask) {
  console.log('docs.config.ts has no `ask`: Ask AI is off, nothing to create.');
  process.exit(0);
}
console.log(`Ask AI for ${service} needs, on the Cloudflare account wrangler is logged in to (nothing is created here):`);
console.log(`  1. the R2 bucket its pages go to:    ../node_modules/.bin/wrangler r2 bucket create ${ask.bucket}`);
console.log(`  2. the AI Search instance over it:   ../node_modules/.bin/wrangler ai-search create ${ask.instance} --type r2 --source ${ask.bucket}`);
console.log(`  3. its AI Gateway, ${ask.gateway}: set it as the instance's gateway (dashboard: AI Search, ${ask.instance}, Settings), then mise run docs:ai-gateway show`);
console.log(`  4. the rate limit: namespace ${ask.rateLimitNamespace}, a number unique on the account (Workers rate limiting needs no creating)`);
console.log('Then mise run docs:deploy: it publishes the pages to the bucket and starts a sync.');

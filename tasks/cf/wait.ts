// cf:wait: wait until <origin>/healthz reports the Worker version recorded in a Wrangler output file
// (up to 60 s), else fail. cf:deploy and cf:preview run it. Cloudflare rolls a new version out over a
// few seconds, so checks start only once /healthz answers with it; a timeout would otherwise test
// the previous version. TypeScript, run by Node as it is, checked by tsc in project:check.
import { readFileSync, readdirSync } from 'node:fs';

/** The entries Wrangler writes to WRANGLER_OUTPUT_FILE_PATH, as far as this reads them. */
type WranglerEntry = { type: string; version_id?: string; preview_alias_url?: string };

const [origin, output] = process.argv.slice(2);
const fail = (message: string): never => { console.error(`cf:wait: ${message}`); process.exit(1); };
if (!origin || !output) fail('usage: cf:wait <origin> <wrangler-output-file>');

// Wrangler's output file is ND-JSON; the last deploy or version-upload entry is this run's.
const entries: WranglerEntry[] = readFileSync(output!, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
const entry = entries.filter(e => e.type === 'deploy' || e.type === 'version-upload').at(-1);
const version = entry?.version_id;
if (!entry || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(version ?? '')) {
  fail(`no Worker version ID in ${output}; did the Wrangler upload succeed?`);
}
if (entry!.preview_alias_url && new URL(entry!.preview_alias_url).origin !== new URL(origin!).origin) {
  fail(`Wrangler published the preview at ${entry!.preview_alias_url}, not ${origin}`);
}

const attempts = 30;
let last = 'no answer';
for (let attempt = 1; attempt <= attempts; attempt++) {
  try {
    const response = await fetch(new URL('/healthz', origin), { cache: 'no-store' });
    const release = response.ok ? ((await response.json()) as { release?: string }).release : undefined;
    if (release === version) {
      console.log(`${origin} serves version ${version}.`);
      await waitForAsset();
      process.exit(0);
    }
    last = response.ok ? `release ${release}` : `HTTP ${response.status}`;
  } catch (error) {
    last = error instanceof Error ? error.message : String(error);
  }
  await new Promise(resolve => setTimeout(resolve, 2000));
}
fail(`${origin}/healthz did not report version ${version} within ${attempts * 2} s (last: ${last})`);

// The Worker answers /healthz as soon as its version is live, but static assets (every page of a
// prerendered app) spread across Cloudflare's edge separately: also wait until this build's entry
// script is served, three times in a row.
async function waitForAsset(): Promise<void> {
  const entry = readdirSync('dist/client/assets').filter(name => /^index-[\w-]+\.js$/.test(name)).at(0);
  if (!entry) return;
  let streak = 0;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await fetch(new URL(`/assets/${entry}`, origin), { cache: 'no-store' }).catch(() => undefined);
    streak = response?.ok ? streak + 1 : 0;
    if (streak === 3) { console.log(`${origin} serves this build's assets (${entry}).`); return; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  fail(`${origin} did not serve this build's /assets/${entry} within ${attempts} s`);
}

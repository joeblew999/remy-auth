// Replaces an AI Search index with this checkout's docs (.plans/docs-site.md, D4): one item per "##"
// section (scripts/docs-manifest.mjs), uploaded to the instance's built-in storage with its url,
// title and release as metadata; items whose keys are not in the upload are deleted, so the index
// holds exactly what was uploaded. Arguments: [--instance <name>] [file or slug ...].
// - Production (the instance the Worker's wrangler.jsonc binds, remy-docs): every page, never a
//   subset; `mise run docs:index` after `cf:deploy`.
// - A dev instance (`mise run docs:dev:index -- docs/tooling.md`): any subset, so a change to one page
//   is indexed in seconds and costs a few embeddings, and production is never touched.
// Credentials: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from the shell, else Wrangler's login.
// Never prints the token.
import { execFileSync } from 'node:child_process';
import { docsManifest, docsRows } from './docs-manifest.mjs';

const production = 'remy-docs';
const args = process.argv.slice(2);
const flag = args.indexOf('--instance');
const instance = flag >= 0 ? args[flag + 1] : production;
const names = flag >= 0 ? args.filter((_, index) => index !== flag && index !== flag + 1) : args;
if (instance === production && names.length > 0) throw new Error(`${production} is production: it is indexed whole. Index a subset into a dev instance: mise run docs:dev:index -- ${names.join(' ')}`);
const namespace = 'default';
const wrangler = (...args) => execFileSync('./node_modules/.bin/wrangler', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const token = process.env.CLOUDFLARE_API_TOKEN || JSON.parse(wrangler('auth', 'token', '--json')).token;
const account = process.env.CLOUDFLARE_ACCOUNT_ID || JSON.parse(wrangler('whoami', '--json')).accounts?.[0]?.id;
if (!token || !account) throw new Error('No Cloudflare credentials: run `mise run cf:cli -- login`, or set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.');
const release = process.env.RELEASE || execFileSync('git', ['describe', '--tags', '--always', '--dirty'], { encoding: 'utf8' }).trim();
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/ai-search/namespaces/${namespace}/instances/${instance}/items`;

async function api(path, init = {}) {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
    // 429 includes "ai_search_instance_overloaded" (7114) while the instance indexes earlier uploads: back off.
    if (response.status === 429 && attempt < 8) {
      await new Promise(resolve => setTimeout(resolve, 1000 * Number(response.headers.get('Retry-After') ?? Math.min(2 ** attempt, 30))));
      continue;
    }
    const body = await response.json();
    if (!body.success) throw new Error(`${init.method ?? 'GET'} items${path}: ${response.status} ${JSON.stringify(body.errors)}`);
    return body;
  }
}

/** Every item in the instance, across pages. */
async function listItems() {
  const items = [];
  for (let page = 1; ; page++) {
    const body = await api(`?page=${page}&per_page=50`);
    items.push(...body.result);
    if (body.result.length === 0 || page >= (body.result_info?.total_pages ?? page)) return items;
  }
}

const manifest = await docsManifest({ release, rows: docsRows(names) });
// Say where this goes before touching anything: it is always remote (Cloudflare), and which instance.
console.log(`Target: Cloudflare (remote), AI Search ${namespace}/${instance}${instance === production ? ' = PRODUCTION' : ' (dev)'}, account ${account}`);
console.log(`Upload: ${manifest.length} sections from ${names.length ? names.join(', ') : 'every docs page'} at ${release}. Each is deleted and re-uploaded; Cloudflare answers "overloaded" while it indexes, and this waits and retries.`);
const existing = await listItems();
const keys = new Set(manifest.map(item => item.key));

// Upload replaces: a key that exists is deleted first (the API refuses a second upload of a key).
for (const [index, item] of manifest.entries()) {
  console.log(`  [${index + 1}/${manifest.length}] ${item.key}`);
  for (const old of existing.filter(entry => entry.key === item.key)) await api(`/${old.id}`, { method: 'DELETE' });
  const form = new FormData();
  form.set('file', new File([item.text], item.key, { type: 'text/markdown' }));
  form.set('metadata', JSON.stringify({ url: item.url, title: item.title, release: item.release }));
  await api('', { method: 'POST', body: form });
}
const stale = existing.filter(entry => !keys.has(entry.key));
for (const entry of stale) await api(`/${entry.id}`, { method: 'DELETE' });

console.log(`docs:index: ${manifest.length} sections uploaded to ${instance} (release ${release}), ${stale.length} others removed`);

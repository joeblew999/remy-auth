// Makes an AI Search index hold exactly this checkout's docs (.plans/docs-site.md, D4): one item per
// "##" section (scripts/docs-manifest.mjs) in the instance's built-in storage, with its url, title and
// release as metadata. Keys carry a hash of the section, so only new or changed sections are uploaded
// and sections no longer in the docs are removed afterwards; then it waits until Cloudflare has indexed them. Arguments: [--instance <name>] [file or slug ...].
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
      console.log(`  Cloudflare is busy indexing (429); waiting`);
      await new Promise(resolve => setTimeout(resolve, 1000 * Number(response.headers.get('Retry-After') ?? Math.min(2 ** attempt, 30))));
      continue;
    }
    // A 5xx or a reply that is not JSON (Cloudflare busy) is retried like a 429.
    const raw = await response.text();
    let body;
    try { body = JSON.parse(raw); } catch { body = undefined; }
    if ((!body || response.status >= 500) && attempt < 8) {
      console.log(`  Cloudflare answered ${response.status}${body ? '' : ' (not JSON)'}; retrying`);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.min(2 ** attempt, 30)));
      continue;
    }
    if (!body) throw new Error(`${init.method ?? 'GET'} items${path}: ${response.status} ${raw.slice(0, 200)}`);
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
if (instance === production && release.endsWith('-dirty')) throw new Error(`${production} is production: index it from a clean commit (uncommitted changes at ${release}). Try changes in dev: mise run docs:dev:index -- <page>`);
// Say where this goes before touching anything: it is always remote (Cloudflare), and which instance.
console.log(`Target: Cloudflare (remote), AI Search ${namespace}/${instance}${instance === production ? ' = PRODUCTION' : ' (dev)'}, account ${account}`);
const existing = await listItems();
const have = new Set(existing.map(entry => entry.key));
const keys = new Set(manifest.map(item => item.key));
const changed = manifest.filter(item => !have.has(item.key));
const stale = existing.filter(entry => !keys.has(entry.key));
console.log(`Sections: ${manifest.length} from ${names.length ? names.join(', ') : 'every docs page'} at ${release}; ${manifest.length - changed.length} unchanged (skipped), ${changed.length} to upload, ${stale.length} to remove.`);

// New and changed sections first (their keys are new), then the ones no longer in the docs: a
// section being replaced is never missing. 429 "overloaded" means Cloudflare is still indexing: wait.
for (const [index, item] of changed.entries()) {
  console.log(`  upload [${index + 1}/${changed.length}] ${item.key}`);
  const form = new FormData();
  form.set('file', new File([item.text], item.key, { type: 'text/markdown' }));
  form.set('metadata', JSON.stringify({ url: item.url, title: item.title, release: item.release }));
  await api('', { method: 'POST', body: form });
}
for (const [index, entry] of stale.entries()) {
  console.log(`  remove [${index + 1}/${stale.length}] ${entry.key}`);
  await api(`/${entry.id}`, { method: 'DELETE' });
}

// Done when Cloudflare has indexed everything it was given (wrangler ai-search stats), up to 5 minutes.
if (changed.length > 0) {
  for (let waited = 0; ; waited += 5) {
    const stats = JSON.parse(wrangler('ai-search', 'stats', instance, '--json'));
    const pending = (stats.queued ?? 0) + (stats.running ?? 0);
    console.log(`  indexing: ${pending} pending, ${stats.completed ?? 0} indexed, ${stats.error ?? 0} errors`);
    if (stats.error) throw new Error(`${instance}: ${stats.error} items failed to index: ${JSON.stringify(stats.file_embed_errors)}`);
    if (pending === 0) break;
    if (waited >= 300) { console.log('  still indexing after 5 minutes; check with: mise run cf:cli -- ai-search stats ' + instance); break; }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

console.log(`docs:index: ${instance} holds ${manifest.length} sections (release ${release}): ${changed.length} uploaded, ${stale.length} removed, ${manifest.length - changed.length} unchanged`);

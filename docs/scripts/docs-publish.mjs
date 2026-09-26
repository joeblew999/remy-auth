// Route B (.plans/docs-ai-sync.md): make the R2 bucket hold exactly the current docs, one file per page
// (<slug>.md, index.md for /docs; a translation under its locale, <locale>/<slug>.md, from
// docs/i18n/<locale>/), then ask AI Search to sync now. Puts and deletes use Wrangler's own
// `r2 object put|delete`; Wrangler cannot list a bucket, so the listing is Cloudflare's R2 API. AI
// Search's sync picks up new, changed and deleted files, so a page removed from the docs table is
// removed from answers too. Production; Wrangler's login.
import { execFileSync } from 'node:child_process';
import { docsConfig } from '../docs.config.ts';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { docsLangs, docsObjectKey, docsTable, docsUrl } from '../src/docs/table.js';

const bucket = docsConfig.bucket;
const instance = 'remy-docs-pages';
const wrangler = (...args) => execFileSync('./node_modules/.bin/wrangler', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const token = JSON.parse(wrangler('auth', 'token', '--json')).token;
const account = JSON.parse(wrangler('whoami', '--json')).accounts[0].id;
console.log(`Target: Cloudflare (remote), R2 bucket ${bucket} (PRODUCTION), then AI Search ${instance}`);

// Each page of both docs sites as Fumadocs renders it for tools (/<site>/<lang?>/<page>.md: frontmatter
// out, includes resolved), fetched from the live docs Worker the deploy just finished (DOCS_ORIGIN), in every
// language the page has its own text in. Keys from the one rule the answer code reads back for citations
// (docsObjectKey): <site>/<lang>/<page>.md.
const origin = process.env.DOCS_ORIGIN;
if (!origin) throw new Error('docs:publish needs DOCS_ORIGIN (the live docs Worker whose .md pages it publishes)');
const wanted = new Map(docsTable.flatMap(row => docsLangs(row, existsSync).map(lang =>
  [docsObjectKey(row.site, row.slug, lang), `${origin}${docsUrl(row.site, row.slug || 'index', lang)}.md`])));
const dir = mkdtempSync(join(tmpdir(), 'docs-publish-'));
for (const [key, url] of wanted) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const file = join(dir, key.replaceAll('/', '_'));
  writeFileSync(file, await response.text());
  wrangler('r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--content-type', 'text/markdown', '--remote');
  console.log(`  put     ${key} <- ${url}`);
}

const listed = [];
for (let cursor; ;) {
  const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${bucket}/objects`);
  if (cursor) url.searchParams.set('cursor', cursor);
  const body = await (await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).json();
  if (!body.success) throw new Error(`list ${bucket}: ${JSON.stringify(body.errors)}`);
  listed.push(...body.result.map(object => object.key));
  cursor = body.result_info?.cursor;
  if (!body.result_info?.is_truncated) break;
}
for (const key of listed.filter(key => !wanted.has(key))) {
  wrangler('r2', 'object', 'delete', `${bucket}/${key}`, '--remote');
  console.log(`  deleted ${key} (no longer a docs page)`);
}
console.log(`${bucket} holds exactly the ${wanted.size} docs pages (English and translations).`);

try {
  wrangler('ai-search', 'jobs', 'create', instance);
  console.log(`Sync started for ${instance}; answers use the new files once it finishes (mise run cf:cli -- ai-search jobs list ${instance}).`);
} catch (error) {
  // Usually a sync already running (the hourly one, or the first after creation): it picks up the files too.
  const reason = String(error.stderr ?? error.message).split('\n').find(line => /error|✘/i.test(line)) ?? 'unknown';
  console.log(`No new sync started (${reason.replace(/\x1b\[[0-9;]*m/g, '').trim()}); a running or the hourly sync picks the files up.`);
}

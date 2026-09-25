// Route B (.plans/docs-ai-sync.md): make the R2 bucket hold exactly the current docs, one file per page
// (<slug>.md, index.md for /docs), then ask AI Search to sync now. Puts and deletes use Wrangler's own
// `r2 object put|delete`; Wrangler cannot list a bucket, so the listing is Cloudflare's R2 API. AI
// Search's sync picks up new, changed and deleted files, so a page removed from the docs table is
// removed from answers too. Production; Wrangler's login.
import { execFileSync } from 'node:child_process';
import { docsObjectKey, docsTable } from '../src/docs/table.js';

const bucket = 'remy-docs';
const instance = 'remy-docs-pages';
const wrangler = (...args) => execFileSync('./node_modules/.bin/wrangler', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const token = JSON.parse(wrangler('auth', 'token', '--json')).token;
const account = JSON.parse(wrangler('whoami', '--json')).accounts[0].id;
console.log(`Target: Cloudflare (remote), R2 bucket ${bucket} (PRODUCTION), then AI Search ${instance}`);

// Keys from the docs table's one rule (docsObjectKey), which the answer code reads back for citations.
const wanted = new Map(docsTable.map(row => [docsObjectKey(row.slug), row.file]));
for (const [key, file] of wanted) {
  wrangler('r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--content-type', 'text/markdown', '--remote');
  console.log(`  put     ${key} <- ${file}`);
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
console.log(`${bucket} holds exactly the ${wanted.size} docs pages.`);

try {
  wrangler('ai-search', 'jobs', 'create', instance);
  console.log(`Sync started for ${instance}; answers use the new files once it finishes (mise run cf:cli -- ai-search jobs list ${instance}).`);
} catch (error) {
  // Usually a sync already running (the hourly one, or the first after creation): it picks up the files too.
  const reason = String(error.stderr ?? error.message).split('\n').find(line => /error|✘/i.test(line)) ?? 'unknown';
  console.log(`No new sync started (${reason.replace(/\x1b\[[0-9;]*m/g, '').trim()}); a running or the hourly sync picks the files up.`);
}

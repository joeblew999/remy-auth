// The dev AI Search instance for working on the docs and answers (mise docs:dev:*): created as a copy
// of production's settings (so dev answers the way production does), with its own name and cache off
// (a reindexed page answers at once), through the same AI Gateway (its logs tag each call with the
// instance's name, and production's spend limit covers dev too). Deleting it removes everything
// indexed in it. Production is never changed here. Arguments: create | delete.
// Built-in storage is the default: no type (production has none either).
// Credentials: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from the shell, else Wrangler's login.
import { execFileSync } from 'node:child_process';

const production = 'remy-docs';
const dev = 'remy-docs-dev';
const namespace = 'default';
const wrangler = (...args) => execFileSync('./node_modules/.bin/wrangler', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const token = process.env.CLOUDFLARE_API_TOKEN || JSON.parse(wrangler('auth', 'token', '--json')).token;
const account = process.env.CLOUDFLARE_ACCOUNT_ID || JSON.parse(wrangler('whoami', '--json')).accounts?.[0]?.id;
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/ai-search/namespaces/${namespace}/instances`;

async function api(method, path = '', body) {
  const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body && JSON.stringify(body) });
  const json = await response.json();
  return { status: response.status, ...json };
}

const command = process.argv[2];
if (command === 'create') {
  if ((await api('GET', `/${dev}`)).success) {
    console.log(`${dev} exists`);
  } else {
    const { result: source } = await api('GET', `/${production}`);
    const settings = ['ai_gateway_id', 'embedding_model', 'chunk', 'chunk_size', 'chunk_overlap', 'max_num_results', 'score_threshold', 'hybrid_search_enabled', 'fusion_method', 'index_method', 'indexing_options', 'retrieval_options', 'reranking', 'rewrite_query', 'custom_metadata'];
    const body = { id: dev, cache: false, ...Object.fromEntries(settings.filter(key => source[key] !== null && source[key] !== undefined && source[key] !== '').map(key => [key, source[key]])) };
    const created = await api('POST', '', body);
    if (!created.success) throw new Error(`create ${dev}: ${created.status} ${JSON.stringify(created.errors)}`);
    console.log(`Created ${dev} (settings from ${production}, cache off, gateway ${source.ai_gateway_id})`);
  }
} else if (command === 'delete') {
  const deleted = await api('DELETE', `/${dev}`);
  if (!deleted.success && deleted.status !== 404) throw new Error(`delete ${dev}: ${deleted.status} ${JSON.stringify(deleted.errors)}`);
  console.log(deleted.success ? `Deleted ${dev} and everything indexed in it` : `${dev} does not exist`);
} else {
  throw new Error('Usage: docs-dev.mjs create | delete');
}

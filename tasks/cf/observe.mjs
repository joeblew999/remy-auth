// Observability of a deployed Worker and its AI, for developers and agents (cf:events, cf:ai-usage,
// cf:ai-check). Everything is read from Cloudflare's own APIs: Workers Logs (telemetry query), AI
// Gateway logs, and the AI Search instance. Nothing is named here: the Worker and the AI Search
// instance come from the including project's Wrangler configuration, and the gateway from the
// instance. Read only: nothing is changed. Never prints a token.
// Credentials: Wrangler's login reads AI Search, but its login cannot ask for AI Gateway or Workers
// Logs access, so those two need CLOUDFLARE_OBSERVE_TOKEN: an API token with "AI Gateway Read" and
// "Workers Observability Write" (the only permission the query API accepts, even to read), kept in
// the gitignored mise.local.toml. CLOUDFLARE_API_TOKEN, when set, is used for everything.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const wranglerBin = './node_modules/.bin/wrangler';
const wrangler = (...args) => execFileSync(wranglerBin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
// The including project's Wrangler (this file may live in mise's include cache, not beside node_modules).
const { unstable_readConfig } = await import(pathToFileURL(createRequire(`${process.cwd()}/package.json`).resolve('wrangler')).href);
const config = unstable_readConfig({});

const token = process.env.CLOUDFLARE_API_TOKEN || JSON.parse(wrangler('auth', 'token', '--json')).token;
const observeToken = process.env.CLOUDFLARE_OBSERVE_TOKEN || process.env.CLOUDFLARE_API_TOKEN || token;
const observed = path => path.startsWith('/ai-gateway/') || path.startsWith('/workers/observability/');
const account = process.env.CLOUDFLARE_ACCOUNT_ID || config.account_id || JSON.parse(wrangler('whoami', '--json')).accounts?.[0]?.id;
if (!token || !account) fail('No Cloudflare credentials: run `mise run cf:cli -- login`, or set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.');

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function api(method, path, { query, body } = {}) {
  const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${observed(path) ? observeToken : token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body && JSON.stringify(body) });
  const json = await response.json();
  if (!json.success && response.status === 403 && observed(path) && !process.env.CLOUDFLARE_OBSERVE_TOKEN) fail(`${method} ${path}: 403. Wrangler's login cannot read AI Gateway or Workers Logs.
Create an API token at https://dash.cloudflare.com/profile/api-tokens with "AI Gateway Read" and
"Workers Observability Write" for this account, then put it in the gitignored mise.local.toml:
  [env]
  CLOUDFLARE_OBSERVE_TOKEN = "<token>"`);
  if (!json.success) fail(`${method} ${path}: ${response.status} ${JSON.stringify(json.errors)}`);
  return json;
}

/** "30m", "24h", "7d" in milliseconds. */
function duration(text) {
  const match = /^(\d+)([mhd])$/.exec(text ?? '');
  if (!match) fail(`A duration is a number and m, h or d (got ${text})`);
  return Number(match[1]) * { m: 60e3, h: 3600e3, d: 86400e3 }[match[2]];
}

/** The AI Search instance this Worker is bound to, and its gateway. */
async function aiSearch() {
  const binding = config.ai_search?.[0];
  if (!binding) fail('The Wrangler configuration has no ai_search binding.');
  const namespace = binding.namespace ?? 'default';
  const { result } = await api('GET', `/ai-search/namespaces/${namespace}/instances/${binding.instance_name}`);
  return { namespace, instance: result, gateway: result.ai_gateway_id };
}

const percentile = (values, p) => values.length ? [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(p * values.length))] : 0;
const usd = value => `$${value.toFixed(4)}`;

const [command, ...args] = process.argv.slice(2);
const option = (name, fallback) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : fallback; };
const positional = args.filter((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));
const since = duration(option('since', command === 'ai-usage' ? '7d' : '24h'));
const to = Date.now();
const from = to - since;

if (command === 'events') {
  // Workers Logs for this Worker: counts by event and level, then the latest events (or those of one event).
  const event = positional[0];
  const service = [{ key: '$metadata.service', operation: 'eq', type: 'string', value: config.name }];
  const filters = event ? [...service, { key: 'event', operation: 'eq', type: 'string', value: event }] : service;
  const counts = await api('POST', '/workers/observability/telemetry/query', { body: {
    queryId: 'mise-cf-events-counts', view: 'calculations', timeframe: { from, to },
    parameters: { datasets: ['cloudflare-workers'], filters: service, calculations: [{ operator: 'count', alias: 'events' }], groupBys: [{ type: 'string', value: 'event' }, { type: 'string', value: 'level' }], limit: 50 } } });
  console.log(`${config.name}, last ${option('since', '24h')}: events by name and level`);
  for (const aggregate of counts.result.calculations?.[0]?.aggregates ?? []) {
    const group = Object.fromEntries(aggregate.groups.map(entry => [entry.key, entry.value]));
    console.log(`  ${String(aggregate.count).padStart(7)}  ${group.event ?? '(no event)'}  ${group.level ?? ''}`);
  }
  const list = await api('POST', '/workers/observability/telemetry/query', { body: {
    queryId: 'mise-cf-events-list', view: 'events', limit: Number(option('limit', '10')), timeframe: { from, to },
    parameters: { datasets: ['cloudflare-workers'], filters, filterCombination: 'and' } } });
  const events = list.result.events?.events ?? [];
  console.log(`\nLatest ${events.length}${event ? ` ${event}` : ''} events:`);
  for (const entry of events) console.log(JSON.stringify(entry.source ?? entry));
} else if (command === 'ai-usage') {
  // AI Gateway logs for the gateway of this Worker's AI Search: calls, cache, errors, tokens, cost, time.
  const { gateway } = await aiSearch();
  const logs = [];
  for (let page = 1; ; page++) {
    const body = await api('GET', `/ai-gateway/gateways/${gateway}/logs`, { query: { page, per_page: 50, order_by: 'created_at', order_by_direction: 'desc', start_date: new Date(from).toISOString(), end_date: new Date(to).toISOString() } });
    logs.push(...body.result);
    if (body.result.length === 0 || page >= (body.result_info?.total_pages ?? page)) break;
  }
  const summary = entries => {
    const live = entries.filter(entry => !entry.cached);
    return { calls: entries.length, cached: entries.length - live.length, failed: entries.filter(entry => !entry.success).length,
      tokensIn: entries.reduce((sum, entry) => sum + (entry.tokens_in ?? 0), 0), tokensOut: entries.reduce((sum, entry) => sum + (entry.tokens_out ?? 0), 0),
      cost: entries.reduce((sum, entry) => sum + (entry.cost ?? 0), 0), p50: percentile(live.map(entry => entry.duration), 0.5), p95: percentile(live.map(entry => entry.duration), 0.95) };
  };
  const line = (label, s) => console.log(`  ${label.padEnd(12)} ${String(s.calls).padStart(6)} calls  ${String(s.cached).padStart(5)} cached  ${String(s.failed).padStart(4)} failed  ${String(s.tokensIn).padStart(8)} in  ${String(s.tokensOut).padStart(7)} out  ${usd(s.cost).padStart(9)}  p50 ${s.p50} ms  p95 ${s.p95} ms`);
  console.log(`AI Gateway ${gateway}, last ${option('since', '7d')} (cost is Cloudflare's estimate; the bill is in the dashboard)`);
  line('total', summary(logs));
  const days = Object.groupBy(logs, entry => entry.created_at.slice(0, 10));
  for (const day of Object.keys(days).sort()) line(day, summary(days[day]));
  const tasks = Object.groupBy(logs, entry => `${entry.metadata?.task ?? entry.model_type ?? 'other'}`);
  for (const task of Object.keys(tasks).sort()) line(task, summary(tasks[task]));
} else if (command === 'ai-check') {
  // The AI setup against Cloudflare's advice for a gateway connected to AI Search, and our own
  // decisions (.plans/observability.md, "AI answers"). Fails on any FAIL; WARN is reported only.
  const { namespace, instance, gateway: gatewayId } = await aiSearch();
  const { result: gateway } = await api('GET', `/ai-gateway/gateways/${gatewayId}`);
  const stats = JSON.parse(wrangler('ai-search', 'stats', instance.id, '--json'));
  const rules = gateway.spend_limits?.enabled ? (gateway.spend_limits.rules ?? []).filter(rule => rule.enabled) : [];
  const results = [
    ['FAIL', !instance.paused && instance.enable, `AI Search ${namespace}/${instance.id} is enabled and not paused`],
    ['FAIL', (stats.error ?? stats.errors ?? 0) === 0, `the index has no errors (${JSON.stringify(stats)})`],
    // Kept on purpose (owner, 2026-09-25: "Safer for costs"): the only cap on total calls, since spend
    // limits do not stop postpaid Workers AI. Cloudflare advises against it (it also slows indexing).
    ['WARN', !gateway.rate_limiting_limit, `the gateway has no rate limit; kept at ${gateway.rate_limiting_limit ?? 'none'} per ${gateway.rate_limiting_interval ?? '-'} s as the only cap on total AI calls (it also slows AI Search's indexing)`],
    ['FAIL', !gateway.cache_ttl, `the gateway does not cache (Cloudflare: use AI Search's own cache); cache_ttl ${gateway.cache_ttl}`],
    ['FAIL', gateway.collect_logs === true, 'the gateway keeps logs (cost, tokens and time per call)'],
    ['FAIL', rules.length > 0, `a spend limit rule is set (${rules.map(rule => `${rule.id}: $${rule.limit} per ${rule.window / 86400} days`).join(', ') || 'none'})`],
    ['FAIL', gateway.workers_ai_billing_mode !== 'postpaid', `spend limits apply to its Workers AI calls: they apply to Unified Billing and BYOK only; billing is ${gateway.workers_ai_billing_mode}`],
    ['WARN', instance.cache === true, `AI Search's own cache is on (${instance.cache_threshold}, ${instance.cache_ttl / 3600} h)`],
    ['WARN', gateway.authentication === true, 'the gateway requires authentication (Cloudflare recommends it)'],
    ['WARN', !gateway.logpush, 'gateway logs are not pushed elsewhere'],
  ];
  console.log(`AI setup for ${config.name}: AI Search ${instance.id} via AI Gateway ${gatewayId}`);
  for (const [severity, ok, text] of results) console.log(`  ${ok ? 'ok  ' : severity} ${text}`);
  console.log('  info questions and answers are stored in gateway logs unless payload logging is turned off (per request: cf-aig-collect-log-payload)');
  if (results.some(([severity, ok]) => severity === 'FAIL' && !ok)) process.exit(1);
} else {
  fail('Usage: observe.mjs events [event] [--since 24h] [--limit 10] | ai-usage [--since 7d] | ai-check');
}

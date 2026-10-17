// Observability of a deployed Worker and its AI, read from Cloudflare's own APIs (`remy observe
// events [event] [--since 24h] [--limit 10] | ai-usage [--since 7d] | ai-check | gateway [show |
// rate-limit off | rate-limit <requests>/<seconds> | logs on|off]`): Workers Logs (the telemetry
// query), AI Gateway logs and settings, the AI Search instance. Nothing is named here: the Worker and
// its AI Search come from the Wrangler configuration (REMY_WRANGLER_CONFIG names the docs Worker's
// generated one; else the nearest), and the gateway from the instance. Never prints a token.
// Credentials: Wrangler's login reads AI Search, but it cannot ask for AI Gateway or Workers Logs
// access, so those use CLOUDFLARE_API_TOKEN ("AI Gateway Edit", which includes reading, and "Workers
// Observability Read"), from fnox (the macOS keychain): fnox exec -- npm run observe -- …
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dispatch, type Subcommands } from './commands.ts';

type Json = Record<string, any>;
function fail(message: string): never { console.error(message); process.exit(1); }

const groupBy = <T>(items: T[], key: (item: T) => string): Record<string, T[]> => {
  const groups: Record<string, T[]> = {};
  for (const item of items) (groups[key(item)] ??= []).push(item);
  return groups;
};

/** Wrangler from this install, run with its login (never the API token, which it would use instead), and the configuration. */
async function setup() {
  const requireHere = createRequire(`${process.cwd()}/package.json`);
  const wranglerPackage = requireHere.resolve('wrangler/package.json');
  const wranglerJs = new URL((requireHere(wranglerPackage) as { bin: { wrangler: string } }).bin.wrangler, pathToFileURL(wranglerPackage)).pathname;
  const { CLOUDFLARE_API_TOKEN: apiToken, ...loginEnv } = process.env;
  const wrangler = (...args: string[]) => execFileSync(process.execPath, [wranglerJs, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: loginEnv });
  const { unstable_readConfig } = await import(pathToFileURL(requireHere.resolve('wrangler')).href) as typeof import('wrangler');
  const config = unstable_readConfig(process.env.REMY_WRANGLER_CONFIG ? { config: process.env.REMY_WRANGLER_CONFIG } : {}) as Json;
  const login = (() => { try { return (JSON.parse(wrangler('auth', 'token', '--json')) as { token: string }).token; } catch { return undefined; } })();
  const token = login || apiToken;
  const observeToken = apiToken || token;
  const account: string | undefined = process.env.CLOUDFLARE_ACCOUNT_ID || config.account_id || (JSON.parse(wrangler('whoami', '--json')) as { accounts?: { id: string }[] }).accounts?.[0]?.id;
  if (!token || !account) fail('No Cloudflare credentials: npx wrangler login, or set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.');
  const observed = (path: string) => path.startsWith('/ai-gateway/') || path.startsWith('/workers/observability/');
  async function api(method: string, path: string, options: { query?: Record<string, string | number | undefined>; body?: unknown; token?: string } = {}): Promise<Json> {
    const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`);
    for (const [key, value] of Object.entries(options.query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));
    const bearer = options.token ?? (observed(path) ? observeToken : token);
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${bearer}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
    const json = await response.json() as Json;
    if (!json.success && response.status === 403 && observed(path) && !apiToken) fail(`${method} ${path}: 403. Wrangler's login cannot read AI Gateway or Workers Logs: run through fnox so CLOUDFLARE_API_TOKEN is set (fnox exec -- npm run observe -- …). The token needs "AI Gateway Edit" and "Workers Observability Read": https://dash.cloudflare.com/profile/api-tokens`);
    if (!json.success) fail(`${method} ${path}: ${response.status} ${JSON.stringify(json.errors)}`);
    return json;
  }
  /** The AI Search instance this Worker is bound to, and its gateway. */
  async function aiSearch() {
    const binding = config.ai_search?.[0];
    if (!binding) fail('The Wrangler configuration has no ai_search binding.');
    const namespace: string = binding.namespace ?? 'default';
    const { result } = await api('GET', `/ai-search/namespaces/${namespace}/instances/${binding.instance_name}`, { token: login ?? token });
    return { namespace, instance: result as Json, gateway: result.ai_gateway_id as string };
  }
  return { config, wrangler, api, aiSearch, apiToken, login, account };
}

/** "30m", "24h", "7d" in milliseconds. */
function duration(text: string | undefined): number {
  const match = /^(\d+)([mhd])$/.exec(text ?? '');
  if (!match) fail(`A duration is a number and m, h or d (got ${text})`);
  return Number(match[1]) * ({ m: 60e3, h: 3600e3, d: 86400e3 } as Record<string, number>)[match[2]!]!;
}
const percentile = (values: number[], p: number) => (values.length ? [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(p * values.length))]! : 0);
const usd = (value: number) => `$${value.toFixed(4)}`;

export async function events(args: string[]): Promise<void> {
  const { config, api } = await setup();
  const option = (name: string, fallback: string) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] ?? fallback : fallback; };
  const event = args.find((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));
  const to = Date.now(); const from = to - duration(option('since', '24h'));
  const service = [{ key: '$metadata.service', operation: 'eq', type: 'string', value: config.name }];
  const filters = event ? [...service, { key: 'event', operation: 'eq', type: 'string', value: event }] : service;
  const counts = await api('POST', '/workers/observability/telemetry/query', { body: { queryId: 'remy-events-counts', view: 'calculations', timeframe: { from, to }, parameters: { datasets: ['cloudflare-workers'], filters: service, calculations: [{ operator: 'count', alias: 'events' }], groupBys: [{ type: 'string', value: 'event' }, { type: 'string', value: 'level' }], limit: 50 } } });
  console.log(`${config.name}, last ${option('since', '24h')}: events by name and level`);
  for (const aggregate of counts.result.calculations?.[0]?.aggregates ?? []) {
    const group = Object.fromEntries((aggregate.groups as { key: string; value: string }[]).map(entry => [entry.key, entry.value]));
    console.log(`  ${String(aggregate.count).padStart(7)}  ${group.event ?? '(no event)'}  ${group.level ?? ''}`);
  }
  const list = await api('POST', '/workers/observability/telemetry/query', { body: { queryId: 'remy-events-list', view: 'events', limit: Number(option('limit', '10')), timeframe: { from, to }, parameters: { datasets: ['cloudflare-workers'], filters, filterCombination: 'and' } } });
  const found: Json[] = list.result.events?.events ?? [];
  console.log(`\nLatest ${found.length}${event ? ` ${event}` : ''} events:`);
  for (const entry of found) console.log(JSON.stringify(entry.source ?? entry));
}

export async function aiUsage(args: string[]): Promise<void> {
  const { api, aiSearch } = await setup();
  const option = (name: string, fallback: string) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] ?? fallback : fallback; };
  const to = Date.now(); const from = to - duration(option('since', '7d'));
  const { gateway } = await aiSearch();
  const logs: Json[] = [];
  for (let page = 1; ; page++) {
    const body = await api('GET', `/ai-gateway/gateways/${gateway}/logs`, { query: { page, per_page: 50, order_by: 'created_at', order_by_direction: 'desc', start_date: new Date(from).toISOString(), end_date: new Date(to).toISOString() } });
    logs.push(...body.result);
    if (body.result.length === 0 || page >= (body.result_info?.total_pages ?? page)) break;
  }
  const summary = (entries: Json[]) => {
    const live = entries.filter(entry => !entry.cached);
    return { calls: entries.length, cached: entries.length - live.length, failed: entries.filter(entry => !entry.success).length,
      tokensIn: entries.reduce((sum, entry) => sum + (entry.tokens_in ?? 0), 0), tokensOut: entries.reduce((sum, entry) => sum + (entry.tokens_out ?? 0), 0),
      cost: entries.reduce((sum, entry) => sum + (entry.cost ?? 0), 0), p50: percentile(live.map(entry => entry.duration), 0.5), p95: percentile(live.map(entry => entry.duration), 0.95) };
  };
  const line = (label: string, s: ReturnType<typeof summary>) => console.log(`  ${label.padEnd(12)} ${String(s.calls).padStart(6)} calls  ${String(s.cached).padStart(5)} cached  ${String(s.failed).padStart(4)} failed  ${String(s.tokensIn).padStart(8)} in  ${String(s.tokensOut).padStart(7)} out  ${usd(s.cost).padStart(9)}  p50 ${s.p50} ms  p95 ${s.p95} ms`);
  console.log(`AI Gateway ${gateway}, last ${option('since', '7d')} (cost is Cloudflare's estimate; the bill is in the dashboard)`);
  line('total', summary(logs));
  const days = groupBy(logs, entry => String(entry.created_at).slice(0, 10));
  for (const day of Object.keys(days).sort()) line(day, summary(days[day]!));
  const tasks = groupBy(logs, entry => `${entry.metadata?.task ?? entry.model_type ?? 'other'}`);
  for (const task of Object.keys(tasks).sort()) line(task, summary(tasks[task]!));
}

/** The AI setup against Cloudflare's advice for a gateway connected to AI Search, and our own decisions (.plans/done/observability.md). Fails on any FAIL; WARN is reported only. */
export async function aiCheck(): Promise<void> {
  const { config, api, aiSearch, wrangler } = await setup();
  const { namespace, instance, gateway: gatewayId } = await aiSearch();
  const { result: gateway } = await api('GET', `/ai-gateway/gateways/${gatewayId}`);
  const stats = JSON.parse(wrangler('ai-search', 'stats', instance.id, '--json')) as Json;
  const rules: Json[] = gateway.spend_limits?.enabled ? (gateway.spend_limits.rules ?? []).filter((rule: Json) => rule.enabled) : [];
  const results: [string, boolean, string][] = [
    ['FAIL', !instance.paused && instance.enable, `AI Search ${namespace}/${instance.id} is enabled and not paused`],
    ['FAIL', (stats.error ?? stats.errors ?? 0) === 0, `the index has no errors (${JSON.stringify(stats)})`],
    // Kept on purpose (owner, 2026-09-25: "Safer for costs"): the only cap on total calls, since spend limits do not stop postpaid Workers AI.
    ['WARN', !gateway.rate_limiting_limit, `the gateway has no rate limit; kept at ${gateway.rate_limiting_limit ?? 'none'} per ${gateway.rate_limiting_interval ?? '-'} s as the only cap on total AI calls`],
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
}

/** Show or change the AI Gateway in front of this Worker's AI Search; every change is read back and printed. */
export async function gateway(args: string[]): Promise<void> {
  const { api, aiSearch, apiToken, login, account } = await setup();
  const { instance, gateway: id } = await aiSearch();
  const show = (g: Json) => console.log([
    `AI Gateway ${id} (in front of AI Search ${instance.id}), account ${account}`,
    `  rate limit: ${g.rate_limiting_limit ? `${g.rate_limiting_limit} per ${g.rate_limiting_interval} s (${g.rate_limiting_technique})` : 'off'}`,
    `  logs:       ${g.collect_logs ? 'on (questions included, kept 7 days)' : 'off'}`,
    `  cache:      ${g.cache_ttl ? `${g.cache_ttl} s` : 'off'}`,
    `  spend:      ${((g.spend_limits?.rules ?? []) as Json[]).map(rule => `$${rule.limit} per ${rule.window / 86400} days${rule.enabled ? '' : ' (disabled)'}`).join(', ') || 'none'}; billing ${g.workers_ai_billing_mode}${g.workers_ai_billing_mode === 'postpaid' ? ' (spend limits do not stop postpaid calls)' : ''}`,
    `  auth:       ${g.authentication ? 'on' : 'off'}`,
  ].join('\n'));
  const [command = 'show', value] = args;
  if (command === 'show') { show((await api('GET', `/ai-gateway/gateways/${id}`, { token: apiToken ?? login })).result); return; }
  if (!apiToken) fail('Changing the gateway needs CLOUDFLARE_API_TOKEN ("AI Gateway Edit"): run through fnox exec --.');
  const current = (await api('GET', `/ai-gateway/gateways/${id}`, { token: apiToken })).result as Json;
  // The update replaces the settings: send every current one, changed only where asked.
  const keys = ['authentication', 'byok_only', 'cache_invalidate_on_update', 'cache_ttl', 'collect_logs', 'dlp', 'guardrails', 'log_classification', 'log_management', 'log_management_strategy', 'logpush', 'logpush_public_key', 'otel', 'rate_limiting_interval', 'rate_limiting_limit', 'rate_limiting_technique', 'retry_backoff', 'retry_delay', 'retry_max_attempts', 'spend_limits', 'store_id', 'workers_ai_billing_mode', 'zdr'];
  const next: Json = Object.fromEntries(keys.filter(key => key in current).map(key => [key, current[key]]));
  if (command === 'rate-limit' && value === 'off') Object.assign(next, { rate_limiting_limit: null, rate_limiting_interval: null, rate_limiting_technique: null });
  else if (command === 'rate-limit' && /^\d+\/\d+$/.test(value ?? '')) { const [limit, seconds] = value!.split('/').map(Number); Object.assign(next, { rate_limiting_limit: limit, rate_limiting_interval: seconds, rate_limiting_technique: 'sliding' }); }
  else if (command === 'logs' && (value === 'on' || value === 'off')) next.collect_logs = value === 'on';
  else fail('remy observe gateway [show | rate-limit off | rate-limit <requests>/<seconds> | logs on | logs off]');
  console.log(`Target: Cloudflare (remote), AI Gateway ${id}: ${command} ${value}`);
  await api('PUT', `/ai-gateway/gateways/${id}`, { token: apiToken, body: next });
  show((await api('GET', `/ai-gateway/gateways/${id}`, { token: apiToken })).result);
}

export const what = "a Worker's logs and its AI Gateway";
export const commands: Subcommands = {
  events: { what: "[event] [--since 24h] [--limit 10]: the Worker's log events", run: rest => events(rest) },
  'ai-usage': { what: "[--since 7d]: Ask AI's usage through the gateway", run: rest => aiUsage(rest) },
  'ai-check': { what: 'Ask AI answers through its gateway', run: () => aiCheck() },
  gateway: { what: "[show | rate-limit off | rate-limit <requests>/<seconds> | logs on|off]: the AI Gateway's settings", run: rest => gateway(rest) },
};
export const main = dispatch('observe', commands);

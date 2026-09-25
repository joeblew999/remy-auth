// Change the AI Gateway in front of this Worker's AI Search (cf:ai-gateway): show its settings, turn
// its rate limit off or set one, turn its logs on or off. The gateway is found as observe.mjs finds it
// (wrangler.jsonc's ai_search binding, then the instance's gateway). Every change is read back and
// printed. Rate limiting "off" is null, as on a gateway created with it off (Cloudflare's default).
// Credentials: CLOUDFLARE_AI_EDIT_TOKEN, an API token with "AI Gateway Edit" (it can also delete the
// gateway, so keep it apart from the read-only CLOUDFLARE_OBSERVE_TOKEN), in the gitignored
// mise.local.toml; Wrangler's login has no AI Gateway access. AI Search is read with Wrangler's login.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const wrangler = (...args) => execFileSync('./node_modules/.bin/wrangler', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const { unstable_readConfig } = await import(pathToFileURL(createRequire(`${process.cwd()}/package.json`).resolve('wrangler')).href);
const config = unstable_readConfig({});
const login = JSON.parse(wrangler('auth', 'token', '--json')).token;
const edit = process.env.CLOUDFLARE_AI_EDIT_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID || config.account_id || JSON.parse(wrangler('whoami', '--json')).accounts?.[0]?.id;

async function api(method, path, token, body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body && JSON.stringify(body) });
  const json = await response.json();
  if (!json.success) {
    console.error(`${method} ${path}: ${response.status} ${JSON.stringify(json.errors)}`);
    if (!edit) console.error('Set CLOUDFLARE_AI_EDIT_TOKEN (an API token with "AI Gateway Edit", from https://dash.cloudflare.com/profile/api-tokens) in the gitignored mise.local.toml.');
    process.exit(1);
  }
  return json.result;
}

const binding = config.ai_search?.[0];
if (!binding) { console.error('The Wrangler configuration has no ai_search binding.'); process.exit(1); }
const instance = await api('GET', `/ai-search/namespaces/${binding.namespace ?? 'default'}/instances/${binding.instance_name}`, login);
const id = instance.ai_gateway_id;
const show = gateway => console.log([
  `AI Gateway ${id} (in front of AI Search ${instance.id}), account ${account}`,
  `  rate limit: ${gateway.rate_limiting_limit ? `${gateway.rate_limiting_limit} per ${gateway.rate_limiting_interval} s (${gateway.rate_limiting_technique})` : 'off'}`,
  `  logs:       ${gateway.collect_logs ? 'on (questions included, kept 7 days)' : 'off'}`,
  `  cache:      ${gateway.cache_ttl ? `${gateway.cache_ttl} s` : 'off'}`,
  `  spend:      ${(gateway.spend_limits?.rules ?? []).map(rule => `$${rule.limit} per ${rule.window / 86400} days${rule.enabled ? '' : ' (disabled)'}`).join(', ') || 'none'}; billing ${gateway.workers_ai_billing_mode}${gateway.workers_ai_billing_mode === 'postpaid' ? ' (spend limits do not stop postpaid calls)' : ''}`,
  `  auth:       ${gateway.authentication ? 'on' : 'off'}`,
].join('\n'));

const [command, value] = process.argv.slice(2);
if (!command || command === 'show') {
  show(await api('GET', `/ai-gateway/gateways/${id}`, edit ?? process.env.CLOUDFLARE_OBSERVE_TOKEN ?? login));
} else {
  if (!edit) { console.error('Changing the gateway needs CLOUDFLARE_AI_EDIT_TOKEN ("AI Gateway Edit") in the gitignored mise.local.toml.'); process.exit(1); }
  const current = await api('GET', `/ai-gateway/gateways/${id}`, edit);
  // The update replaces the settings: send every current one, changed only where asked.
  const keys = ['authentication', 'byok_only', 'cache_invalidate_on_update', 'cache_ttl', 'collect_logs', 'dlp', 'guardrails', 'log_classification', 'log_management', 'log_management_strategy', 'logpush', 'logpush_public_key', 'otel', 'rate_limiting_interval', 'rate_limiting_limit', 'rate_limiting_technique', 'retry_backoff', 'retry_delay', 'retry_max_attempts', 'spend_limits', 'store_id', 'workers_ai_billing_mode', 'zdr'];
  const next = Object.fromEntries(keys.filter(key => key in current).map(key => [key, current[key]]));
  if (command === 'rate-limit' && value === 'off') Object.assign(next, { rate_limiting_limit: null, rate_limiting_interval: null, rate_limiting_technique: null });
  else if (command === 'rate-limit' && /^\d+\/\d+$/.test(value ?? '')) { const [limit, seconds] = value.split('/').map(Number); Object.assign(next, { rate_limiting_limit: limit, rate_limiting_interval: seconds, rate_limiting_technique: 'sliding' }); }
  else if (command === 'logs' && (value === 'on' || value === 'off')) next.collect_logs = value === 'on';
  else { console.error('Usage: cf:ai-gateway [show | rate-limit off | rate-limit <requests>/<seconds> | logs on | logs off]'); process.exit(1); }
  console.log(`Target: Cloudflare (remote), AI Gateway ${id}: ${command} ${value}`);
  await api('PUT', `/ai-gateway/gateways/${id}`, edit, next);
  show(await api('GET', `/ai-gateway/gateways/${id}`, edit));
}

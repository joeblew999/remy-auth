// `remy api spec [origin] [--urls]`: the OpenAPI 3.1 document a Worker generates from its contract, from
// /api/openapi.json (about a second; network only). The document is never committed: the Worker
// generates it from the contract in-process, so this asks the running Worker for it. With --urls, the
// reference page and one line per operation instead of the document.
function fail(message: string): never { console.error(message); process.exit(1); }

export async function spec(args: string[]): Promise<void> {
  const urls = args.includes('--urls');
  const origin = args.find(arg => !arg.startsWith('--')) || process.env.DEPLOY_ORIGIN;
  if (!origin) fail('api spec: pass an origin or put origins.production in remy.config.ts');
  const specUrl = new URL('/api/openapi.json', origin);
  const response = await fetch(specUrl, { headers: { Accept: 'application/json' } });
  if (!response.ok) fail(`api spec: ${specUrl.href} answered ${response.status}${response.status === 404 ? ': this app serves no contract API at /api (an app mounts one with @joeblew999/remy-ui/api/server)' : ''}`);
  const document = await response.json() as { openapi?: string; info: { title: string; version: string }; paths?: Record<string, Record<string, { summary?: string }>> };
  if (!(document.openapi ?? '').startsWith('3.1.')) fail(`api spec: ${specUrl.href} is not an OpenAPI 3.1 document`);
  if (!urls) { console.log(JSON.stringify(document, null, 2)); return; }
  console.log(`${document.info.title} ${document.info.version}`);
  console.log(`Reference: ${new URL('/api/doc', origin).href}`);
  console.log(`Document:  ${specUrl.href}`);
  for (const [path, operations] of Object.entries(document.paths ?? {})) for (const [method, operation] of Object.entries(operations)) console.log(`  ${method.toUpperCase().padEnd(6)} ${new URL(path, origin).href}  ${operation.summary ?? ''}`);
}

export const what = 'spec [origin] [--urls]: the OpenAPI document a Worker generates from its contract';
export async function main(args: string[]): Promise<void> {
  if (args[0] !== 'spec') fail('remy api: spec [origin] [--urls]');
  return spec(args.slice(1));
}

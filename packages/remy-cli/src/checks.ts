#!/usr/bin/env node
// remy-check: the project's own checks, one per Vite Plus task (`check:commands`, `check:wrangler`…), each a plain tool:
// it reads, says what is wrong, and exits non-zero, and nothing else happens around it (no timing record, no
// configuration loaded, unlike `remy`). A check never writes: `--write` fixes what it would report (the commands list,
// the docs pages' endings), which is what `vp run fix` runs. remy-auth runs this source; an app the package's bin.
import { writeCommands } from './help.ts';
import { checkAll as translations } from './i18n.ts';
import { rightEndings } from './page.ts';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { appDir, docsDir } from './config.ts';

/**
 * The Worker's configuration keeps what every Remy app keeps, which Wrangler does not check itself: preview URLs off
 * unless Cloudflare's Previews are on, Smart Placement, and observability on (logs and traces, persisted, sampled,
 * query strings redacted).
 */
export async function wrangler(): Promise<void> {
  const { unstable_readConfig } = (await import(
    pathToFileURL(createRequire(import.meta.url).resolve('wrangler')).href
  )) as typeof import('wrangler');
  const config = unstable_readConfig({ config: join(appDir(), 'wrangler.jsonc') }) as Record<string, any>;
  const problems: string[] = [];
  const want = (ok: boolean, problem: string) => ok || problems.push(problem);
  // preview_urls makes every uploaded version and alias public, old ones without the app's later fixes: on only
  // with Cloudflare's Previews (a `previews` block), which is what gives each branch its preview URL.
  if (config.previews === undefined)
    want(config.preview_urls === false, 'preview_urls must be false (true only with a previews block)');
  // Without Smart Placement a visitor far from the databases waits one ocean crossing per query (2026-10-17).
  want(config.placement?.mode === 'smart', '"placement": { "mode": "smart" } (run the Worker near its databases)');
  const observability = config.observability;
  want(observability?.enabled === true, 'observability must be enabled');
  want(observability?.redact_query_string === true, 'query-string redaction must be enabled');
  want(observability?.logs?.invocation_logs === true, 'invocation logs must be enabled');
  for (const signal of ['logs', 'traces']) {
    const settings = observability?.[signal];
    want(settings?.enabled === true && settings?.persist === true, `${signal} must be enabled and persist`);
    const rate = settings?.head_sampling_rate;
    want(Number.isFinite(rate) && rate > 0 && rate <= 1, `${signal}: a sampling rate above 0, at most 1`);
  }
  if (problems.length) {
    console.error(`wrangler.jsonc:\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log('wrangler.jsonc: preview URLs, placement and observability as every Remy app keeps them.');
}

const checks: Record<string, (write: boolean) => void | Promise<unknown>> = {
  // The Worker's configuration: preview URLs, placement, observability.
  wrangler: () => wrangler(),
  // COMMANDS.md (here, and the blank app's in remy-auth) is what the command line and the tasks say.
  commands: async (write) => {
    await writeCommands(!write);
  },
  // Each docs page's ending: .mdx when it uses a component, .md otherwise (here and the blank app's).
  endings: (write) => {
    const lines = rightEndings(
      [join(docsDir() ?? 'docs', 'content'), 'packages/create/templates/app/docs/content'],
      !write,
    );
    for (const line of lines) console.log(`endings: ${line}`);
    if (!write && lines.length) {
      console.error('endings: vp run fix renames them.');
      process.exit(1);
    }
  },
  // The translations, offline: a warning while they are owed (vp run translate writes them, in the change).
  translations: () => translations(false),
};

const [name = '', ...rest] = process.argv.slice(2);
const check = checks[name];
if (!check) {
  console.error(`remy-check <${Object.keys(checks).join('|')}> [--write]`);
  process.exit(2);
}
await check(rest.includes('--write'));

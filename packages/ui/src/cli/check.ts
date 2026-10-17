// The check (STEP 1, `remy flow change`): what runs after every change, in seconds, and nothing that needs a
// browser. Every part is a function here (.plans/tooling-in-typescript.md, slice 2). `remy check
// <part>` runs one part.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { whenChanged } from './unchanged.ts';
import { writeCommands } from './help.ts';
import { rightEndings } from './page.ts';
import { checkAll as translations } from './i18n.ts';
import { check as plans } from './plans.ts';

/**
 * The packages that break when installed twice (React's hooks, TanStack's router and query types, the
 * MDX stringifier Fumadocs builds with) have one version in this install. The list is the package's
 * own (@joeblew999/remy-ui's package.json, "remy.singleCopy"); npm's hoisting decides the rest.
 */
export function singleCopies(): void {
  const { remy } = JSON.parse(
    readFileSync(join(process.cwd(), 'node_modules/@joeblew999/remy-ui/package.json'), 'utf8'),
  ) as { remy?: { singleCopy?: string[] } };
  const problems: string[] = [];
  for (const name of remy?.singleCopy ?? []) {
    const found = JSON.parse(
      execFileSync('npm', ['query', `#${name}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
    ) as { version: string; location: string }[];
    const versions = [...new Set(found.map((item) => item.version))];
    if (versions.length > 1)
      problems.push(`${name}: ${versions.join(', ')} (${found.map((item) => item.location).join(', ')})`);
  }
  if (problems.length) {
    console.error(
      `single copies: installed more than once, which breaks at run or type-check time:\n  ${problems.join('\n  ')}\nThe versions come from @joeblew999/remy-ui; remove this app's own pins of them, then npm install.`,
    );
    process.exit(1);
  }
  console.log(`single copies: one version each of ${remy?.singleCopy?.length ?? 0} packages.`);
}

/** A tool from this install, in the foreground; the check stops at its first failure. */
function tool(name: string, args: string[], options: { cwd?: string; env?: Record<string, string> } = {}): void {
  const bin = join(process.cwd(), 'node_modules', '.bin', name);
  const result = spawnSync(bin, args, { cwd: options.cwd, stdio: 'inherit', env: { ...process.env, ...options.env } });
  if (result.status !== 0) {
    console.error(`${name} ${args.join(' ')}: failed`);
    process.exit(result.status ?? 1);
  }
}

/** What the app generates before type checking: its package.json's "generate" script, when it has one (remy-auth: the catalogs, the skill, this bin; an app: its own catalog). */
export function generate(): void {
  const result = spawnSync('npm', ['run', '--if-present', '--silent', 'generate'], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error('generate: the package.json "generate" script failed');
    process.exit(result.status ?? 1);
  }
}

/** src/routeTree.gen.ts, regenerated when a route file, the parts list or the Start instance (whose types it registers) changed (TanStack Start's plugin writes it during a build). */
export const routes = (): void =>
  whenChanged('routes', ['src/routes/**/*', 'src/parts.json', 'src/start.ts'], () => tool('vp', ['build', '.']));

/** Generate, Worker types, then the app's TypeScript (the command line's included: it is in the package's src). */
export function types(): void {
  generate();
  tool('wrangler', ['types']);
  tool('tsc', []);
}

/** The checks that are plain functions (the *.unit.spec.ts files under tests): no build, no Worker, no browser. */
export const unit = (): void =>
  tool('playwright', ['test', '--project=unit', '--pass-with-no-tests'], { env: { TEST_TARGET: 'unit' } });

/** The docs Worker's check (build, binding types, types) when the app has docs and something in them changed since it last passed. */
export function docs(): void {
  if (!existsSync('docs')) return;
  whenChanged(
    'docs',
    [
      'docs/content/**/*',
      'docs/*.ts',
      'docs/*.json',
      'packages/ui/src/docs/**/*.ts',
      'packages/ui/src/docs/**/*.tsx',
      'packages/ui/src/docs/**/*.js',
    ],
    () => {
      tool('vp', ['build', '.'], { cwd: 'docs' });
      tool('wrangler', ['types', '-c', '.remy-docs/wrangler.json'], { cwd: 'docs' });
      tool('tsc', ['-p', '.'], { cwd: 'docs' });
    },
  );
}

/** Under vp run ci (here and on GitHub) the check verifies what vp run check would fix itself: it writes nothing. */
const verifying = (): boolean => process.env.REMY_FLOW === 'ci';

/** The parts, in order. Translations are a warning here. */
export const parts: Record<string, () => void | Promise<unknown>> = {
  plans,
  'single-copies': singleCopies,
  routes,
  types,
  // COMMANDS.md, the docs' Commands page, written from the command line itself (help.ts), before the unit
  // checks, which fail when it is stale.
  commands: () => writeCommands(verifying()),
  // Each docs page's ending (.md, or .mdx when it uses a component), here and in the blank app: renamed, never asked.
  endings: () => {
    const lines = rightEndings(['docs/content', 'template/docs/content'], verifying());
    for (const line of lines) console.log(`endings: ${line}`);
    if (verifying() && lines.length) {
      console.error('endings: vp run check renames them.');
      process.exit(1);
    }
  },
  unit,
  translations: () => translations(false),
  docs,
};

/** The whole check. */
export async function check(): Promise<void> {
  for (const part of Object.values(parts)) await part();
}

export const what = `the check (vp run check), or one part: ${Object.keys(parts).join(' · ')}`;
export async function main(args: string[]): Promise<void> {
  const [name] = args;
  if (!name) {
    await check();
    return;
  }
  const part = parts[name];
  if (!part) {
    console.error(
      `remy check: no part "${name}"; one of ${Object.keys(parts).join(', ')}, or none for the whole check.`,
    );
    process.exit(2);
  }
  await part();
}

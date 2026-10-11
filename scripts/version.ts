// npm run ui:version -- <version>: the next release's version, written everywhere it appears: the
// package, the showcase's and the contract's peer range (they are written against this release's
// exports), the lockfile, and the blank app's three pins. Then template:check.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) { console.error('npm run ui:version -- <version>: the next version without the v, e.g. 0.15.0'); process.exit(2); }
const npm = (...args: string[]) => execFileSync('npm', args, { stdio: ['ignore', 'ignore', 'inherit'] });
npm('pkg', 'set', `version=${version}`, '--workspace', '@joeblew999/remy-ui');
npm('pkg', 'set', `peerDependencies.@joeblew999/remy-ui=>=${version}`, '--workspace', '@joeblew999/remy-showcase');
npm('pkg', 'set', `peerDependencies.@joeblew999/remy-ui=>=${version}`, '--workspace', '@joeblew999/remy-auth-contract');
npm('install', '--package-lock-only', '--no-audit', '--no-fund', '--loglevel=error');
execFileSync('npm', ['pkg', 'set', `dependencies.@joeblew999/remy-ui=${version}`], { cwd: 'template', stdio: ['ignore', 'ignore', 'inherit'] });
const retag = (file: string, pattern: RegExp) => { if (!existsSync(file)) return; writeFileSync(file, readFileSync(file, 'utf8').replace(pattern, `$1v${version}`)); };
retag('template/mise.toml', /(tasks\?ref=)v\d+\.\d+\.\d+/g);
retag('template/.github/workflows/google.yml', /(google\.yml@)v\d+\.\d+\.\d+/g);
execFileSync(process.execPath, ['scripts/template-check.ts'], { stdio: 'inherit' });

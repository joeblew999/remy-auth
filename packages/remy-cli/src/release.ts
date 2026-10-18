// `remy release check`: what would stop a release, before its checks run. The release itself is the release script,
// where every step is named and in order (the owner's word starts it):
//
//   remy release check && CHECK_LOCALES=all vp run ci && vp run publish:rehearse && remy test cwv && remy packages tag
//
// (remy-auth adds its own release checks, vp run template:check and vp run ui:verify, after vp run ci.)
//
// GitHub's release job then publishes from the tag.
import { dispatch, type Subcommands } from './commands.ts';
import { releaseReady } from './packages.ts';
import { execFileSync } from 'node:child_process';

/** A clean main, the translations complete, every changed package's version bumped. */
export async function check(): Promise<void> {
  const here = where();
  if (!here.onMain || !here.clean) {
    console.error(
      `release: a release is made from a clean main (this is ${here.branch}${here.clean ? '' : ', with changes'}); push it to main first`,
    );
    process.exit(1);
  }
  await releaseReady();
  console.log('release: a clean main, translations complete, versions bumped.');
}

export const what = 'what a release needs before its checks (vp run release runs it first)';
export const commands: Subcommands = {
  check: { what: 'a clean main, the translations complete, every changed package bumped', run: () => check() },
};
export const main = dispatch('release', commands);

/** The branch this checkout is on, and whether its tree is clean. */
function where(): { branch: string; onMain: boolean; clean: boolean } {
  const git = (...args: string[]) =>
    execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const branch = git('branch', '--show-current');
  return { branch, onMain: branch === 'main', clean: git('status', '--porcelain') === '' };
}

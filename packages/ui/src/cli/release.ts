// `remy release check`: what would stop a release, before its checks run. The release itself is the release script,
// where every step is named and in order (the owner's word starts it):
//
//   remy release check && CHECK_LOCALES=all vp run ci && vp run release-checks && vp run publish:rehearse &&
//   remy test cwv && remy packages tag
//
// GitHub's release job then publishes from the tag.
import { dispatch, type Subcommands } from './commands.ts';
import { releaseReady } from './packages.ts';
import { where } from './status.ts';

/** A clean main, the translations complete, every changed package's version bumped. */
export async function check(): Promise<void> {
  const here = where();
  if (!here.onMain || !here.clean) {
    console.error(
      `release: a release is made from a clean main (this is ${here.branch}${here.clean ? '' : ', with changes'}); vp run land first`,
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

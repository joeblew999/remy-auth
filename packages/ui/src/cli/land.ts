// `remy land start` and `remy land finish "<what changed>"`: the two ends of a landing, the git and GitHub work Vite Plus
// has no tool for. What runs between them, and in what order, is the land script's to say, where it can be read:
//
//   remy land start && vp run translate && vp run ci && remy land finish
//
// (`vp run land "<what changed>"` hands its words to the last command, finish.) Each end does its own job and decides
// nothing else: no state handed from one to the other, nothing in the environment, nothing skipped.
import { execFileSync, spawnSync } from 'node:child_process';
import { dispatch, type Subcommands } from './commands.ts';
import { deploy } from './cloudflare.ts';
import { origins } from './config.ts';
import { deleteBranch, merge, openPull, pullFor, repo, waitForChecks } from './github.ts';
import { describeRun, latestRun, where } from './status.ts';

const git = (...args: string[]) => execFileSync('git', args, { stdio: ['ignore', 'inherit', 'inherit'] });
const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
function fail(line: string): never {
  console.error(`land: ${line}`);
  process.exit(1);
}
/** The worktree that has main checked out, if any (git worktree list): this checkout may be it, or another. */
function mainWorktree(): string | undefined {
  let path: string | undefined;
  for (const line of read('worktree', 'list', '--porcelain').split('\n')) {
    if (line.startsWith('worktree ')) path = line.slice('worktree '.length);
    else if (line === 'branch refs/heads/main') return path;
  }
  return undefined;
}

/** Main as GitHub has it, into origin/main: named in full, so no clone's fetch rule decides it (one fetched only its own branch, 2026-10-17). */
const fetchMain = () => git('fetch', '-q', 'origin', '+refs/heads/main:refs/remotes/origin/main');

/**
 * The work on a branch of its own with main in it: off main when it is on main (a landing never goes straight to
 * main), then main merged in (among many agents main moves under every branch; a conflict stops here, with git's own
 * list of the files). Uncommitted work comes along as it is: git merges around it, or says which file is in the way.
 */
export function start(): void {
  const here = where();
  // Landing on a red main is allowed (the fix is a landing too) and never silent.
  const mainRun = latestRun();
  if (mainRun && mainRun.status === 'completed' && mainRun.conclusion !== 'success')
    console.log(
      `land: main is RED, ${describeRun(mainRun)}. Landing on it anyway; if this is not the fix, somebody's is owed.`,
    );
  fetchMain();
  if (here.onMain) {
    if (here.clean && read('rev-list', '--count', 'origin/main..HEAD') === '0')
      fail('nothing to land: main is clean and on origin/main.');
    const branch = `land/${new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').toLowerCase()}`;
    git('switch', '-q', '-c', branch);
    console.log(`land: the work moves from main to ${branch}, which lands through a pull request.`);
  }
  const branch = read('branch', '--show-current');
  if (!branch) fail('this checkout is on no branch (a detached HEAD): switch to a branch, or to main, then land.');
  if (read('rev-list', '--count', `${branch}..origin/main`) !== '0') {
    const merged = spawnSync('git', ['merge', '-q', '--autostash', 'origin/main', '-m', `Merge main into ${branch}`], {
      stdio: 'inherit',
    });
    if (merged.status !== 0)
      fail(`main does not merge cleanly into ${branch}: resolve what git names, then land again.`);
    console.log(`land: main merged into ${branch}.`);
  }
}

/**
 * The landing itself, through a pull request (the owner's rule: never straight to main; merged when GitHub is green):
 * one commit of everything, the branch pushed, its pull request opened (or the open one updated), GitHub's checks
 * waited for, the squash merge, this checkout on the new main, then staging where this machine is signed in to
 * Cloudflare. Production is `vp run promote`.
 */
export async function finish(args: string[]): Promise<void> {
  const message = args.join(' ').trim();
  if (!message) fail('say what changed: vp run land "<what changed>"');
  // The first line titles the commit and the pull request; the rest, if any, is their body.
  const [title = message, ...rest] = message.split('\n');
  const body = rest.join('\n').trim();
  const slug = repo() ?? fail('origin is not a GitHub repository, so there is nowhere to open the pull request.');
  const here = where();
  if (here.onMain) fail('this is main: vp run land starts by moving the work to a branch of its own.');
  if (!here.clean) {
    git('add', '-A');
    git('commit', '-q', '-m', message);
  }
  if (read('rev-list', '--count', 'origin/main..HEAD') === '0')
    fail('nothing to land: this branch has nothing main does not.');
  // The land script ran vp run ci just now, so this push skips Vite Plus's pre-push hook (its own switch, VP_GIT_HOOKS=0,
  // given to this one git command): a second vp run ci inside the first would only replay the cache.
  if (
    spawnSync('git', ['push', '-q', '-u', 'origin', `HEAD:refs/heads/${here.branch}`], {
      stdio: 'inherit',
      env: { ...process.env, VP_GIT_HOOKS: '0' },
    }).status !== 0
  )
    fail(`pushing ${here.branch} failed; nothing is merged.`);
  const head = read('rev-parse', 'HEAD');
  const pull =
    pullFor(slug, here.branch) ??
    openPull(
      slug,
      here.branch,
      title,
      `${body ? `${body}\n\n` : ''}Landed with \`vp run land\`: \`vp run ci\` passed here first.`,
    );
  console.log(`land: ${pull.html_url} is open; GitHub checks ${head.slice(0, 7)}.`);

  const verdict = await waitForChecks(slug, head);
  if (verdict.state === 'waiting')
    fail(
      `GitHub's checks on ${pull.html_url} are still running after 20 minutes; the pull request stays open. Land again to wait again.`,
    );
  if (verdict.state === 'red')
    fail(
      `GitHub's checks failed on ${pull.html_url}: ${verdict.failed.map((run) => `${run.name} (${run.html_url})`).join(', ')}. A job is one \`vp run <task>\` (its name), the same here. The pull request stays open; fix, then land again.`,
    );
  const merged = merge(slug, pull.number, `${title} (#${pull.number})`, body);
  if ('refused' in merged)
    fail(
      `GitHub would not merge ${pull.html_url}: ${merged.refused}. If main moved and conflicts, land again (main comes in first).`,
    );
  deleteBranch(slug, here.branch);
  console.log(`land: merged as ${merged.sha.slice(0, 7)} (${pull.html_url}).`);

  // This checkout onto the new main, the branch's content now in it (squashed), whichever way the work is laid out:
  // when no other worktree has main, this checkout moves to main (reset, not fast-forwarded: a main the work started
  // on still holds its commits, which the squash replaced); when another worktree has main (the usual case: work in a
  // worktree of its own), this branch is reset to the new main, ready for the next change, and that worktree's main
  // is brought forward. Each step says what failed rather than stopping with a stack trace (2026-10-17: a switch that
  // failed quietly left the next reset to move the wrong branch).
  fetchMain();
  const step = (what: string, ...args: string[]) => {
    if (spawnSync('git', args, { stdio: 'inherit' }).status !== 0)
      fail(`merged as ${merged.sha.slice(0, 7)}, but ${what} failed (git ${args.join(' ')}); the change is in main.`);
  };
  const elsewhere = mainWorktree();
  if (!elsewhere || elsewhere === read('rev-parse', '--show-toplevel')) {
    step('moving this checkout to main', 'switch', '-q', 'main');
    step('bringing main to the new main', 'reset', '-q', '--keep', 'origin/main');
    step(`deleting the landed branch ${here.branch}`, 'branch', '-q', '-D', here.branch);
    console.log(`land: this checkout is on the new main.`);
  } else {
    step(`resetting ${here.branch} to the new main`, 'reset', '-q', '--keep', 'origin/main');
    const forward = spawnSync('git', ['-C', elsewhere, 'merge', '-q', '--ff-only', 'origin/main'], {
      stdio: 'inherit',
    });
    console.log(
      forward.status === 0
        ? `land: ${here.branch} is the new main here, and main in ${elsewhere} is brought forward.`
        : `land: ${here.branch} is the new main here; main in ${elsewhere} could not fast-forward (it has changes of its own), so bring it forward there.`,
    );
  }

  // Staging, from the merged main, where this machine can sign in to Cloudflare (a cloud agent's container cannot:
  // that is not a failure of the landing, docs: working from Claude's cloud). A failed staging deploy says so and ends
  // the step non-zero; the change is merged either way.
  if (!origins().staging) return console.log('land: no origins.staging in remy.config.ts; nothing deployed.');
  const signedIn =
    !!process.env.CLOUDFLARE_API_TOKEN ||
    !/not authenticated/i.test(
      spawnSync('npx', ['wrangler', 'whoami'], { encoding: 'utf8', timeout: 30_000 }).stdout ?? '',
    );
  if (!signedIn)
    return console.log('land: no Cloudflare sign-in on this machine, so staging is not deployed from here.');
  await deploy('staging');
  console.log('land: staging is up. Production: vp run promote.');
}

export const what = 'a landing\'s two ends, around the checks (vp run land "<what changed>" runs both)';
export const commands: Subcommands = {
  start: { what: 'the work on a branch of its own, main merged in', run: () => start() },
  finish: {
    what: '"<what changed>": one commit, its pull request, merged when GitHub agrees, this checkout on the new main, then staging',
    run: (rest) => finish(rest),
  },
};
export const main = dispatch('land', commands);

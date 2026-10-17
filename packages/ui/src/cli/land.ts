import { execFileSync, spawnSync } from 'node:child_process';
import { ended, span, type Landing } from './feedback.ts';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { lap, laps } from './timing.ts';
import { preparedFile } from './prepare.ts';
import { where } from './flow.ts';
import { remyCommand } from './config.ts';
import { deleteBranch, merge, openPull, pullFor, repo, waitForChecks } from './github.ts';

export async function main(args: string[]): Promise<void> {
  // The last part of `vp run land` (its script: remy flow prepare, then vp run ci, then this), through a pull request,
  // never straight to main (owner's rule: work goes through a branch and a pull request, and the pull request merges
  // when green). prepare brought main in and translated; Vite Plus's ci passed here. Then, each part once: one commit;
  // push the branch; open its pull request (or update the open one); wait for GitHub's checks (they confirm what
  // passed here); merge it; bring this checkout to the new main; deploy staging. Production is vp run promote. It
  // says what each part took.
  process.env.REMY_FLOW = 'land';
  const message = args.join(' ').trim();
  if (!message) {
    console.error('land: say what changed: vp run land "<message>"');
    process.exit(1);
  }
  // The first line titles the commit and the pull request; the rest, if any, is their body.
  const [title = message, ...rest] = message.split('\n');
  const body = rest.join('\n').trim();
  const git = (...args: string[]) => execFileSync('git', args, { stdio: ['ignore', 'inherit', 'inherit'] });
  const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  function fail(line: string): never {
    console.error(`land: ${line}`);
    process.exit(1);
  }
  const slug = repo() ?? fail('origin is not a GitHub repository, so there is nowhere to open the pull request.');
  const prepared = existsSync(preparedFile())
    ? (JSON.parse(readFileSync(preparedFile(), 'utf8')) as { translation: Landing['translation']; fromMain: boolean })
    : fail('nothing was prepared: land through vp run land "<what changed>", which prepares, checks, then lands.');
  rmSync(preparedFile());
  const { translation, fromMain } = prepared;
  const here = where();
  if (here.onMain) fail('this is main; vp run land moves the work to a branch of its own first.');
  if (read('status', '--porcelain') !== '') {
    git('add', '-A');
    git('commit', '-q', '-m', message);
  }
  if (read('rev-list', '--count', 'origin/main..HEAD') === '0')
    fail('nothing to land: this branch has nothing main does not.');

  // One push of the branch (the pre-push hook skips: REMY_FLOW is set, and the browser checks just passed), then its pull request.
  git('push', '-q', '-u', 'origin', `HEAD:refs/heads/${here.branch}`);
  const head = read('rev-parse', 'HEAD');
  const pull =
    pullFor(slug, here.branch) ??
    openPull(
      slug,
      here.branch,
      title,
      `${body ? `${body}\n\n` : ''}Landed with \`vp run land\`: \`vp run ci\` passed here first.`,
    );
  lap('commit, push and pull request');
  console.log(`land: ${pull.html_url} is open; GitHub checks ${head.slice(0, 7)} (what passed here, confirmed).`);

  const verdict = await waitForChecks(slug, head);
  lap("GitHub's checks");
  if (verdict.state === 'waiting')
    fail(
      `GitHub's checks on ${pull.html_url} are still running after 20 minutes; the pull request stays open. Land again to wait again.`,
    );
  if (verdict.state === 'red')
    fail(
      `GitHub's checks failed on ${pull.html_url}: ${verdict.failed.map((run) => `${run.name} (${run.html_url})`).join(', ')}. Each job is one \`vp run ci <part>\`, which reproduces it here. The pull request stays open; fix, then land again.`,
    );
  const merged = merge(slug, pull.number, `${title} (#${pull.number})`, body);
  if ('refused' in merged)
    fail(
      `GitHub would not merge ${pull.html_url}: ${merged.refused}. If main moved and conflicts, land again (main comes in first).`,
    );
  const landed = merged.sha;
  deleteBranch(slug, here.branch);
  lap('merge');
  console.log(
    `land: merged as ${landed.slice(0, 7)} (${pull.html_url}); main's own run checks everything, every part in every language; vp run promote waits for it.`,
  );

  // This checkout and the main checkout follow the new main: the branch's content is in it (squashed), so the
  // branch is reset to it, ready for the next change.
  execFileSync('git', ['fetch', '-q', 'origin', 'main']);
  if (fromMain) {
    git('switch', '-q', 'main');
    git('reset', '-q', '--keep', 'origin/main');
    git('branch', '-q', '-D', here.branch);
  } else git('reset', '-q', '--keep', 'origin/main');
  const root = read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
  if (read('-C', root, 'branch', '--show-current') === 'main')
    spawnSync('git', ['-C', root, 'merge', '-q', '--ff-only', 'origin/main'], { stdio: 'inherit' });
  else spawnSync('git', ['-C', root, 'fetch', '-q', 'origin', 'main:main'], { stdio: 'ignore' });

  // Staging, from the merged main. A staging failure (the deploy or its live smoke) does not undo the landing:
  // the last line says the whole state and the step ends non-zero.
  // A machine with no Cloudflare sign-in (a cloud agent's container: no token there) skips staging and says so;
  // that is not a failure of the landing (docs/content/dev/agents.md, working from Claude's cloud).
  const signedIn =
    !!process.env.CLOUDFLARE_API_TOKEN ||
    !/not authenticated/i.test(
      spawnSync('npx', ['wrangler', 'whoami'], { encoding: 'utf8', timeout: 30_000 }).stdout ?? '',
    );
  const [remy, ...remyArgs] = remyCommand();
  const staging: Landing['staging'] = !process.env.STAGING_ORIGIN
    ? 'none'
    : !signedIn
      ? 'signed out'
      : spawnSync(remy!, [...remyArgs, 'cloudflare', 'staging'], { stdio: 'inherit' }).status === 0
        ? 'up'
        : 'failed';
  lap('staging');
  if (staging === 'up')
    console.log(
      `land: staging is up, ${span(laps().reduce((sum, part) => sum + part.ms, 0))} after the start. Production: vp run promote.`,
    );
  else if (staging === 'none') console.log('land: no origins.staging in remy.config.ts; nothing deployed.');
  else if (staging === 'signed out')
    console.log('land: no Cloudflare sign-in on this machine, so staging is not deployed from here.');
  else
    console.error(
      'land: staging failed (the lines above say whether the deploy or the live smoke); the change is merged; the last line says the state.',
    );

  const end = ended({ commit: landed, staging, translation }, laps());
  if (end.failed) {
    console.error(end.line);
    process.exit(1);
  }
  console.log(end.line);
}

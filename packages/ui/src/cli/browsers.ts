// `remy browsers` (the browsers task, which the browser checks and Google's audits depend on): what a browser check
// needs on this machine. Playwright's own Chromium, at the version @playwright/test pins (the same browser on a Mac, in
// a cloud agent's container and on GitHub, so a check gives the same answer everywhere; Playwright installs it once
// per version). On Linux, a Han font: the Han languages are drawn by system fonts (fonts.css ships none for them),
// so a machine without one draws empty boxes, which the font checks rightly refuse. GitHub's runners have none: Noto
// CJK is installed where this process may (root, or sudo without a password); anywhere else it stops with the fix.
import { spawnSync } from 'node:child_process';
import { bin } from './config.ts';

const run = (command: string, args: string[], env: Record<string, string> = {}): void => {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const quiet = (command: string, args: string[]) => spawnSync(command, args, { encoding: 'utf8' });

function fonts(): void {
  if (process.platform !== 'linux') return;
  if (/Noto Sans CJK/.test(quiet('fc-list', [':', 'family']).stdout ?? '')) return;
  const root = process.getuid?.() === 0;
  const sudo = root ? [] : quiet('sudo', ['-n', 'true']).status === 0 ? ['sudo', '-n'] : undefined;
  if (!sudo) {
    console.error(
      'browsers: the font checks need a Han font on Linux: install the package fonts-noto-cjk, then run again.',
    );
    process.exit(1);
  }
  console.log(
    'browsers: installing Noto CJK (fonts-noto-cjk): Japanese and Chinese have no other font on this machine',
  );
  const [command, ...rest] = [...sudo, 'apt-get', 'install', '-y', '--no-install-recommends', 'fonts-noto-cjk'];
  run(command!, rest, { DEBIAN_FRONTEND: 'noninteractive' });
}

export const what = "what a browser check needs on this machine: Playwright's Chromium, and on Linux a Han font";
export function main(): void {
  run(bin('playwright'), ['install', 'chromium']);
  fonts();
}

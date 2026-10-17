import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { docsGaps, pagePrints, withRecord } from '../../packages/ui/src/cli/i18n';

// A page renamed (or deleted) but not yet committed is still in git's index; the checker counted it, so a
// renamed page was both "missing" and an "orphan" and the translator went looking for it (2026-10-17).
test('a page renamed but not committed is neither missing nor an orphan', () => {
  const repo = mkdtempSync(join(tmpdir(), 'i18n-renamed-'));
  const site = join(repo, 'docs/content/users');
  mkdirSync(site, { recursive: true });
  writeFileSync(join(site, 'i18n.json'), JSON.stringify({ defaultLanguage: 'en', languages: ['en', 'es'] }));
  const english = '---\ntitle: "App"\n---\n\nPlain.\n';
  writeFileSync(join(site, 'app.mdx'), english);
  writeFileSync(join(site, 'app.es.mdx'), withRecord('---\ntitle: "App"\n---\n\nSimple.\n', pagePrints(english)));
  const git = (...args: string[]) => execFileSync('git', ['-C', repo, '-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { stdio: 'ignore' });
  git('init', '-q'); git('add', '-A'); git('commit', '-qm', 'pages');
  renameSync(join(site, 'app.mdx'), join(site, 'app.md'));
  renameSync(join(site, 'app.es.mdx'), join(site, 'app.es.md'));
  expect(docsGaps(repo).gaps).toEqual([]);
});

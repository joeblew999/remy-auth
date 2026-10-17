import { test, expect } from '@playwright/test';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { needsMdx, rightEndings } from '../../packages/ui/src/cli/page';

// A docs page is .md unless it uses a component, then .mdx; dev:change renames it, so nobody has to know (owner, 2026-10-17).

test('a page needs MDX for a component, not for a tag in code or plain text', () => {
  expect(needsMdx('Hello <Tabs items={["a"]}>')).toBe(true);
  expect(needsMdx('<include>../../../COMMANDS.md</include>')).toBe(true);
  expect(needsMdx('Run `<Tabs>` here, or:\n```tsx\n<Card />\n```\nplain <name> text')).toBe(false);
  expect(needsMdx('# Title\n\nJust prose.')).toBe(false);
});

test('a page with the wrong ending is renamed with its translations, and the links to it follow', () => {
  const dir = mkdtempSync(join(tmpdir(), 'endings-'));
  mkdirSync(join(dir, 'users'));
  writeFileSync(join(dir, 'users', 'app.mdx'), '# App\n\nPlain.\n');
  writeFileSync(join(dir, 'users', 'app.es.mdx'), '# App\n\nSimple.\n');
  writeFileSync(join(dir, 'users', 'tabs.md'), '<Tabs items={["a"]} />\n');
  writeFileSync(join(dir, 'users', 'index.mdx'), '<Card href="./app.mdx">App</Card> [tabs](./tabs.md)\n');
  expect(rightEndings([dir]).length).toBe(3);
  expect(readdirSync(join(dir, 'users')).sort()).toEqual(['app.es.md', 'app.md', 'index.mdx', 'tabs.mdx']);
  expect(readFileSync(join(dir, 'users', 'index.mdx'), 'utf8')).toBe('<Card href="./app.md">App</Card> [tabs](./tabs.mdx)\n');
  expect(rightEndings([dir])).toEqual([]);
});

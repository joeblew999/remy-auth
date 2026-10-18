import { test, expect } from 'vite-plus/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { commandsDirs, commandsFile, commandsMarkdown } from '../../packages/remy-cli/src/help';

// The commands are listed in one place, generated from the command line (owner: never by hand, they drift).
// COMMANDS.md is what the docs' Commands page includes; vp run ready rewrites it, and this fails when it is stale.
test('COMMANDS.md, here and in the blank app, is what the command line says it can do', async () => {
  for (const dir of commandsDirs())
    expect(
      readFileSync(join(dir, commandsFile), 'utf8'),
      `${dir}/COMMANDS.md: run npx remy help --write (vp run fix does it)`,
    ).toBe(await commandsMarkdown(dir));
});

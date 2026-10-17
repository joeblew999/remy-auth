import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { commandsDirs, commandsFile, commandsMarkdown } from '../../packages/ui/src/cli/help';

// The commands are listed in one place, generated from the command line (owner: never by hand, they drift).
// COMMANDS.md is what the docs' Commands page includes; dev:change rewrites it, and this fails when it is stale.
test('COMMANDS.md, here and in the blank app, is what the command line says it can do', async () => {
  for (const dir of commandsDirs())
    expect(
      readFileSync(join(dir, commandsFile), 'utf8'),
      `${dir}/COMMANDS.md: run npx remy help --write (dev:change does it)`,
    ).toBe(await commandsMarkdown(dir));
});

import { test, expect } from 'vite-plus/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every database is read through `replicated(env.X, 'X')` (@joeblew999/remy-ui/replicas), never as the raw binding:
// a raw `env.DB.prepare` still works, but always reads the primary, so the read copies would be lost without anyone
// noticing. The binding names are wrangler.jsonc's, so a database added there is covered here.

const bindings = [
  ...readFileSync('apps/remy-auth/wrangler.jsonc', 'utf8').matchAll(/"binding":\s*"([A-Z0-9_]+)",\s*"database_name"/g),
].map((match) => match[1]);
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx|js)$/.test(name) ? [path] : [];
  });

test('the app uses each database through replicated(), never the raw binding', () => {
  expect(bindings.length, 'wrangler.jsonc names its D1 databases').toBeGreaterThan(0);
  const raw = files('apps/remy-auth/src').flatMap((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        bindings.some(
          (name) => new RegExp(`env\\.${name}\\b`).test(line) && !new RegExp(`replicated\\(env\\.${name},`).test(line),
        )
          ? [`${file}:${index + 1}: ${line.trim()}`]
          : [],
      ),
  );
  expect(raw, "use replicated(env.X, 'X') from @joeblew999/remy-ui/replicas").toEqual([]);
});

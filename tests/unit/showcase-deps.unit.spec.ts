import { test, expect } from 'vite-plus/test';
import { readdirSync, readFileSync } from 'node:fs';

// The showcase declares what it imports, at the platform's exact versions, so an app installing both gets one
// copy of each wherever npm places them. On 2026-10-11 it declared only the platform as a peer: in
// remy-auth-app (a lock grown since 0.10) zod 3 sat at the top of node_modules for shadcn, the showcase's
// `zod/mini` resolved to it, and the build failed; here, where the workspace hoists everything, nothing saw it.

const read = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as { dependencies?: Record<string, string> };

test("the showcase's dependencies are the platform's, at the platform's exact versions", () => {
  const platform = read('packages/remy-ui/package.json').dependencies ?? {};
  const showcase = read('packages/remy-showcase/package.json').dependencies ?? {};
  const differing = Object.entries(showcase)
    .filter(([name, version]) => platform[name] !== version)
    .map(([name, version]) => `${name}: ${version} here, ${platform[name] ?? 'absent'} in @joeblew999/remy-ui`);
  expect(
    differing,
    "vp run ui:version keeps them equal; a dependency the platform does not have is the showcase's own to pin",
  ).toEqual([]);
});

test('every package the showcase imports is one it declares, or the platform itself', () => {
  const declared = new Set(Object.keys(read('packages/remy-showcase/package.json').dependencies ?? {}));
  const imported = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (/\.(?:[jt]sx?)$/.test(entry.name))
        for (const match of readFileSync(path, 'utf8').matchAll(/from\s+'([^'.][^']*)'/g)) {
          const source = match[1]!;
          if (source.startsWith('@joeblew999/') || source.startsWith('virtual:') || source.startsWith('node:'))
            continue;
          imported.add(source.startsWith('@') ? source.split('/').slice(0, 2).join('/') : source.split('/')[0]!);
        }
    }
  };
  walk('packages/remy-showcase/src');
  expect([...imported].filter((name) => !declared.has(name)).sort()).toEqual([]);
});

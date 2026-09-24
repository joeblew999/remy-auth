import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// A real npm tarball consumer catches workspace-only imports and missing assets.
const temporary = await mkdtemp(join(tmpdir(), 'remy-ui-consumer-'));
try {
  const manifest = JSON.parse(await readFile('package.json', 'utf8'));
  const result = JSON.parse(execFileSync('npm', ['pack', '--workspace', '@remy/ui',
    '--pack-destination', temporary, '--json'], { encoding: 'utf8' }));
  await writeFile(join(temporary, 'package.json'), JSON.stringify({
    name: 'remy-ui-package-check', private: true, type: 'module',
    dependencies: { '@remy/ui': `file:./${result[0].filename}`,
      react: manifest.dependencies.react, 'react-dom': manifest.dependencies['react-dom'] },
  }));
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline'],
    { cwd: temporary, stdio: 'inherit' });
  await writeFile(join(temporary, 'index.html'), '<html lang="en"><head><title>Package check</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
  await writeFile(join(temporary, 'main.tsx'), `
    import { createRoot } from 'react-dom/client';
    import { Button } from '@remy/ui/button';
    import { m } from '@remy/ui/messages';
    import { locales } from '@remy/ui/locale';
    import './styles.css';
    createRoot(document.getElementById('root')!).render(
      <Button>{m.increment({}, { locale: locales[0] })}</Button>
    );
  `);
  // Tailwind is a consumer build tool, resolved from this repo's pinned install.
  const tailwind = import.meta.resolve('tailwindcss/index.css');
  await writeFile(join(temporary, 'styles.css'), `@import "${new URL(tailwind).pathname}";\n@import "@remy/ui/styles.css";\n@source "./node_modules/@remy/ui/src";\n`);
  await build({ root: temporary, configFile: false, plugins: [tailwindcss()],
    oxc: { jsx: { runtime: 'automatic' } }, build: { outDir: 'dist' } });
  console.log('Packed shared UI builds in an isolated Vite/Tailwind consumer.');
} finally {
  await rm(temporary, { recursive: true, force: true });
}

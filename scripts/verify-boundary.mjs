// The app and Worker must consume the shared UI only through its public exports, so that
// what works here also works for any other consumer of the published package.
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const files = execFileSync('git', ['ls-files', 'app', 'workers'], { encoding: 'utf8' }).split('\n').filter(file => file && existsSync(file));
// Tailwind's @source scan hint may name the package directory; only imports of its source are forbidden.
const offenders = files.filter(file => /(from|import)\s*\(?\s*['"][^'"]*packages\/ui\//.test(readFileSync(file, 'utf8')));
if (offenders.length) {
  console.error(`Import the shared UI through @joeblew999/remy-ui/*, not its source: ${offenders.join(', ')}`);
  process.exit(1);
}
console.log(`Boundary check: ${files.length} app and Worker files use only the package's public exports.`);

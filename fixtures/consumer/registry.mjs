// The new-app test's registry for @joeblew999/create (run.sh): this commit's packed package, served the way npm's
// registry serves one, so `vp create @joeblew999:app` makes the app exactly as it will from GitHub Packages, from code
// no registry has. Usage: node registry.mjs <port> <package.json> <tarball>. It answers until the test ends.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const [port, manifestFile, tarballFile] = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const tarball = readFileSync(tarballFile);
const base = `http://127.0.0.1:${port}`;
const packument = {
  name: manifest.name,
  'dist-tags': { latest: manifest.version },
  versions: { [manifest.version]: { ...manifest, dist: { tarball: `${base}/create.tgz` } } },
};
createServer((request, response) => {
  if (request.url === '/create.tgz') {
    response.writeHead(200, { 'content-type': 'application/octet-stream' }).end(tarball);
  } else if (decodeURIComponent(request.url ?? '') === `/${manifest.name}`) {
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(packument));
  } else {
    response.writeHead(404).end('{}');
  }
}).listen(Number(port), '127.0.0.1');

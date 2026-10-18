// The stand-in registry for the new-app and upgrade tests (run.sh, upgrade.sh): this commit's packed packages, served the
// way npm's registry serves one, so `vp create @joeblew999:app` and `vp add` get code no registry has. With an upstream
// (GitHub Packages), every other version of our scope passes through from there, with the token in GITHUB_TOKEN.
// Usage: node registry.mjs <port> <upstream or -> <package.json>=<tarball>... It answers until the test ends.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const [port, upstream, ...pairs] = process.argv.slice(2);
const base = `http://127.0.0.1:${port}`;
const local = new Map(
  pairs.map((pair, index) => {
    const [manifestFile, tarballFile] = pair.split('=');
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    return [manifest.name, { manifest, tarball: readFileSync(tarballFile), path: `/-/${index}.tgz` }];
  }),
);
const token = process.env.GITHUB_TOKEN;

/** The scope's packument from upstream, or an empty one. */
async function upstreamPackument(name) {
  if (upstream === '-') return { name, 'dist-tags': {}, versions: {} };
  const response = await fetch(`${upstream}/${name.replace('/', '%2f')}`, {
    headers: { accept: 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  return response.ok ? response.json() : { name, 'dist-tags': {}, versions: {} };
}

createServer(async (request, response) => {
  const url = decodeURIComponent(request.url ?? '');
  const tarball = [...local.values()].find((entry) => entry.path === url);
  if (tarball) return response.writeHead(200, { 'content-type': 'application/octet-stream' }).end(tarball.tarball);
  const name = url.slice(1);
  const ours = local.get(name);
  if (!ours && (upstream === '-' || !name.startsWith('@joeblew999/'))) return response.writeHead(404).end('{}');
  const packument = await upstreamPackument(name);
  if (ours) {
    packument.versions = {
      ...packument.versions,
      // As GitHub Packages serves a version: its own fields only (createConfig stripped, so vp create has to read it
      // from the tarball, as it must from GitHub; issue #44), and the tarball's integrity.
      [ours.manifest.version]: {
        ...Object.fromEntries(Object.entries(ours.manifest).filter(([key]) => key !== 'createConfig')),
        dist: {
          tarball: `${base}${ours.path}`,
          integrity: `sha512-${createHash('sha512').update(ours.tarball).digest('base64')}`,
        },
      },
    };
    packument['dist-tags'] = {
      ...packument['dist-tags'],
      ...(upstream === '-' ? { latest: ours.manifest.version } : {}),
    };
  }
  response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(packument));
}).listen(Number(port), '127.0.0.1');

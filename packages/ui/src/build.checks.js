import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

// What a Worker built on the package says it is (worker.ts's /healthz, build-vite.js's stamp). In a
// module of its own, with nothing of the app's pages in it, so the docs Worker's checks run it too.

const local = process.env.TEST_TARGET !== 'remote';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** This checkout's commit, or nothing outside a git checkout. */
function head() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

/**
 * The deployment answers for itself: its environment, Cloudflare's version of it and the build stamp.
 * A local run tests the artifact built from this checkout, so the stamp must name this checkout's
 * commit: a stamp left over from an earlier build fails here (remy-sport shipped one for weeks).
 */
export function buildChecks({ service }) {
  test(`/healthz says which deployment of ${service} answered: its environment and the build it was made from`, async ({ request }) => {
    const response = await request.get('/healthz');
    expect(response.status()).toBe(200);
    // It names nobody, and another deployment's page may read it to show what is deployed.
    expect(response.headers()['access-control-allow-origin']).toBe('*');
    const body = await response.json();
    expect(body.service).toBe(service);
    expect(body.environment).toMatch(/^[a-z][a-z0-9-]*$/);
    const { build } = body;
    expect(typeof build.app.name).toBe('string');
    expect(typeof build.app.version).toBe('string');
    expect(build.commit).toMatch(/^([0-9a-f]{40})?$/);
    expect(build.changes).toMatch(/^([0-9a-f]{7})?$/);
    expect(Object.keys(build.packages)).toContain('@joeblew999/remy-ui');
    for (const [name, version] of Object.entries(build.packages)) expect(version, name).toMatch(/^\d+\.\d+\.\d+/);
    if (local) {
      expect(build.commit, 'the build under test was made from this checkout').toBe(head());
    } else {
      // A deployment is a version Cloudflare knows, with the time it was given it.
      expect(body.release).toMatch(uuid);
      expect(Number.isNaN(Date.parse(body.deployedAt))).toBe(false);
    }
  });
}

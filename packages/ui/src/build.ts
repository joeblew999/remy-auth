import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';

// What a deployment is, as every Worker built on this package answers at /healthz (worker.ts), and
// how a page asks. Nothing here is remembered anywhere: each deployment says what it is, so the
// answer cannot go stale (remy-sport's /api/versions, whose committed versions file drifted for weeks).

/** What a build is, from its sources (build-vite.js): the Worker and the page it serves carry the same one. */
export const stamp = z.object({
  app: z.object({
    name: z.string().describe("The app's package name"),
    version: z.string().describe("The app's package version; empty when it has none"),
  }),
  commit: z.string().describe('The commit it was built from; empty when it was not built in a git checkout'),
  changes: z.string().describe('Empty for a clean checkout; else a short hash of what was uncommitted'),
  packages: z.record(z.string(), z.string()).describe('The installed version of each package the stamp lists'),
});
export type Build = z.infer<typeof stamp>;

/**
 * What /healthz answers. A deployment made before the build stamp existed answers only the first
 * three, so the rest are optional to a reader; a Worker on this version always sends them.
 */
export const deployment = z.object({
  status: z.literal('ok'),
  service: z.string().describe('The Worker that answered'),
  release: z.string().describe("Cloudflare's ID of the deployed version, or \"local\""),
  environment: z.string().optional().describe('The environment the Worker declares (ENVIRONMENT); production when it declares none'),
  deployedAt: z.string().optional().describe('When Cloudflare was given this version; absent locally'),
  build: stamp.optional(),
});
export type Deployment = z.infer<typeof deployment>;

/** Whether two builds are the same code: the same commit with the same uncommitted changes. */
export const sameBuild = (a: Pick<Build, 'commit' | 'changes'>, b: Pick<Build, 'commit' | 'changes'>) => a.commit === b.commit && a.changes === b.changes;

/** A commit as people quote it. */
export const shortCommit = (commit: string) => commit.slice(0, 7);

/** How often an open page asks its deployment again, and how long an answer counts as fresh. */
export const deploymentRefreshMs = 5 * 60_000;

/** Asks the Worker at `origin` (the page's own by default) what it is; an answer of another shape is an error. */
export async function askDeployment(origin = ''): Promise<Deployment> {
  const response = await fetch(`${origin}/healthz`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${origin}/healthz answered ${response.status}`);
  return deployment.parse(await response.json());
}

/** TanStack Query options for a deployment: asked in the browser, again every five minutes and when the tab is looked at again. */
export const deploymentQuery = (origin = '') => queryOptions({
  queryKey: ['remy', 'deployment', origin],
  queryFn: () => askDeployment(origin),
  staleTime: deploymentRefreshMs,
  refetchInterval: deploymentRefreshMs,
  retry: false,
});

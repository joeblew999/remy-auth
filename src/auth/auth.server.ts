import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';
import { permits, publishedCodeFor } from './environment';
import { codeSender } from './mail.server';
import { authOptions } from './options';
import { seededPeople } from './seed';

/** The code a seeded person signs in with where this environment publishes one (./environment.ts). */
const fixedCode = (email: string) => publishedCodeFor(env, email);

const build = (baseURL: string) => betterAuth(authOptions({ database: env.DB, secret: env.BETTER_AUTH_SECRET, baseURL, sendCode: codeSender(env), fixedCode }));

// One instance per origin this Worker answers on, built on first use and kept for the isolate's life:
// the bindings do not change, and nothing is built at module scope, where a Worker has no request.
const instances = new Map<string, ReturnType<typeof build>>();

/**
 * Better Auth for the origin `request` came to, which is its base URL (the issuer) and the only
 * origin it trusts. Better Auth's native D1 support takes the binding itself (`database: env.DB`).
 */
export function auth(request: Request) {
  const { origin } = new URL(request.url);
  let instance = instances.get(origin);
  if (!instance) instances.set(origin, instance = build(origin));
  return instance;
}

export type Auth = ReturnType<typeof auth>;
/** Better Auth's session and user, as `auth.api.getSession` answers them. */
export type Session = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;

/**
 * The seeded people, made to exist (src/auth/seed.ts): each one missing is created through Better
 * Auth's own adapter with their stable ID, a verified address and their platform role. One that is
 * there is left as it is, so an edit made by hand survives. Only where the environment allows seeded
 * sign-in; anywhere else this refuses.
 */
export async function ensureSeededPeople(request: Request): Promise<void> {
  if (!permits(env, 'seededSignIn')) throw new Error('This environment has no seeded people.');
  const { adapter } = await auth(request).$context;
  const at = new Date();
  for (const person of seededPeople) {
    if (await adapter.findOne({ model: 'user', where: [{ field: 'id', value: person.id }] })) continue;
    await adapter.create({ model: 'user', data: { ...person, emailVerified: true, createdAt: at, updatedAt: at }, forceAllowId: true });
  }
}

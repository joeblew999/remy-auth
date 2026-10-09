import { env } from 'cloudflare:workers';
import { betterAuth } from 'better-auth';
import { codeSender } from './mail.server';
import { authOptions } from './options';

const build = (baseURL: string) => betterAuth(authOptions({ database: env.DB, secret: env.BETTER_AUTH_SECRET, baseURL, sendCode: codeSender(env) }));

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

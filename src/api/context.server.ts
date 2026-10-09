import { env } from 'cloudflare:workers';
import { getSessionCookie } from 'better-auth/cookies';
import { once } from '@joeblew999/remy-ui/api/guard';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { auth } from '../auth/auth.server';
import { notesStore } from '../notes/store';
import type { ApiContext } from './router';

/**
 * A call's context, from the request it serves. The language is Paraglide's for this request: for an
 * HTTP call to /api, what its Accept-Language asks for (routeStrategies in packages/ui/paraglide.mjs;
 * the app's client sends the page's language, so a cookie from another tab does not decide); for a
 * call from a server loader, the page's language. The release comes from the same source as /healthz.
 * The session is Better Auth's, read from this request's cookies as oRPC's Better Auth guide shares
 * it: asked for only by a procedure whose policy needs it, and once per call. A request with no
 * session cookie (Better Auth's own getSessionCookie) is nobody without asking Better Auth or D1.
 * The notes demo's data and its relation engine are the showcase's own database (DEMO_DB), which
 * knows people only by account ID.
 */
export const apiContext = (request: Request): ApiContext => {
  const notes = notesStore(env.DEMO_DB);
  return {
    locale: getLocale(),
    release: env.CF_VERSION_METADATA?.id ?? 'local',
    getSession: once(async () => (getSessionCookie(request) ? auth(request).api.getSession({ headers: request.headers }) : null)),
    relations: notes.relations,
    notes,
  };
};

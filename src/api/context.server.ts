import { env } from 'cloudflare:workers';
import { getLocale } from '@joeblew999/remy-ui/locale';
import type { ApiContext } from './router';

/**
 * A call's context. The language is Paraglide's for this request: for an HTTP call to /api, what
 * its Accept-Language asks for (routeStrategies in packages/ui/paraglide.mjs; the app's client
 * sends the page's language, so a cookie from another tab does not decide); for a call from a
 * server loader, the page's language. The release comes from the same source as /healthz.
 */
export const apiContext = (): ApiContext => ({ locale: getLocale(), release: env.CF_VERSION_METADATA?.id ?? 'local' });

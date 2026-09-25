import { createServerFn } from '@tanstack/react-start';
import { env } from 'cloudflare:workers';
import { service } from '../service';

export type Status = { status: 'ok'; service: string; release: string };

/**
 * The liveness answer of /healthz as a server function: the same fields from the same sources
 * (withObservability in the shared package). /healthz itself is answered before Start runs, so
 * the status card reads this instead. Answering at all is what "ok" means.
 */
export const getStatus = createServerFn({ method: 'GET' }).handler((): Status => ({
  status: 'ok',
  service,
  release: env.CF_VERSION_METADATA?.id ?? 'local',
}));

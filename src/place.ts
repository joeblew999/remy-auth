import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { placeFromCloudflare } from '@joeblew999/remy-ui/cloudflare';

/** Cloudflare's geolocation of the request (`request.cf`): read in the Worker, also when a client navigation calls it. Never logged or stored. */
export const getPlace = createServerFn({ method: 'GET' }).handler(() =>
  // Workers types `cf` as incoming or outgoing properties; an incoming request has the former.
  placeFromCloudflare(getRequest().cf as IncomingRequestCfProperties | undefined));

import { createServerOnlyFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { placeFromCloudflare, type Place } from '@joeblew999/remy-ui/cloudflare';

// Server only, twice over: the `.server.ts` name puts this file under Start's import protection,
// so a production build fails if browser code imports it, and `createServerOnlyFn` throws if it
// is ever called outside the Worker. build-boundaries.checks.js proves none of it ships.

/** Cloudflare's geolocation of the current request (`request.cf`). Never logged or stored. */
export const requestPlace = createServerOnlyFn((): Place =>
  // Workers types `cf` as incoming or outgoing properties; an incoming request has the former.
  placeFromCloudflare(getRequest().cf as IncomingRequestCfProperties | undefined));

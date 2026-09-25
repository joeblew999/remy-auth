import { createServerFn } from '@tanstack/react-start';
import { requestPlace } from './place.server';

/** Cloudflare's geolocation of the request: read in the Worker, also when a client navigation calls it (see place.server.ts). */
export const getPlace = createServerFn({ method: 'GET' }).handler(() => requestPlace());

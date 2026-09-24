import { createContext } from 'react-router';

/** Cloudflare's view of the request: bindings, execution context and the network's geolocation. */
export const cloudflareContext = createContext<{
  env: Env; ctx: ExecutionContext; cf?: IncomingRequestCfProperties;
}>();

import { createORPCClient } from '@orpc/client';
import type { RouterContract, RouterContractClient } from '@orpc/contract';
import { ResponseValidationLinkPlugin } from '@orpc/contract/plugins';
import { OpenAPILink } from '@orpc/openapi/fetch';
import { createIsomorphicFn } from '@tanstack/react-start';
import { getLocale } from '../paraglide/runtime.js';

// The client half (.plans/openapi-contracts.md): the types are the contract itself, so nothing
// is generated and nothing can drift, and every response is parsed against the contract before
// use, so a response that breaks it is a typed error (oRPC's ValidationError), never wrong data.

/**
 * A typed client for `contract` served at `origin` (contract paths start with /api/; leave `origin`
 * out in the browser to call the page's own): oRPC's OpenAPILink with ResponseValidationLinkPlugin.
 * Requests carry the page's language (Paraglide's getLocale) as Accept-Language, so the server
 * answers in it. Use it to call another Remy app through that app's published contract.
 */
export function contractClient<C extends RouterContract>(contract: C, { origin }: { origin?: string | (() => string) } = {}): RouterContractClient<C> {
  const link = new OpenAPILink(contract, {
    origin,
    url: '/',
    headers: () => ({ 'accept-language': getLocale() }),
    plugins: [new ResponseValidationLinkPlugin(contract)],
  });
  return createORPCClient(link);
}

/**
 * An app's client for its own contract, the same object on both sides (TanStack Start's
 * createIsomorphicFn): on the server `server()`, which should be oRPC's createRouterClient wrapped
 * in createServerOnlyFn so the router never reaches the browser (no HTTP hop inside a loader);
 * in the browser `contractClient` against this page's origin.
 */
export function isomorphicClient<C extends RouterContract>(contract: C, { server }: { server: () => RouterContractClient<C> }): RouterContractClient<C> {
  return createIsomorphicFn()
    .server(server)
    .client(() => contractClient(contract))();
}

/**
 * The other apps whose pages may call this API from the browser (CORS, oRPC's CORSPlugin through
 * apiHandlers): each registered app's deployed origin, exact, no wildcard. Other origins, local
 * builds and throwaway previews of those apps included, get no Access-Control-Allow-Origin, so a
 * browser there cannot read the answer (.plans/openapi-contracts.md, work item 4). The list moves
 * to refined C's registered clients when those exist.
 */
export const registeredOrigins = [
  // remy-auth-app: its status card reads GET /api/status (its mise.toml DEPLOY_ORIGIN).
  'https://remy-auth-app.gedw99.workers.dev',
] as const;

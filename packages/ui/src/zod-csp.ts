import { config } from 'zod';

// Zod's documented switch for pages whose Content Security Policy forbids eval (https://zod.dev/api#jitless):
// without it, Zod probes for eval with `Function('')` on the first object parse, which the nonce CSP every
// Remy app sends reports as a violation, and blocks when enforced. Set once for every app: AppProviders,
// which every app's root renders, and the docs Worker's router import this module.
config({ jitless: true });

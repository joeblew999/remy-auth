// vp run auth:provision: what a deployment (production, and the branches' Previews) needs on Cloudflare,
// printed; nothing is created (that is the owner's). The identity database and the showcase's, each
// with its id in wrangler.jsonc and its migrations, the secret, and the domain the sign-in code is
// mailed from. Until then the deploy refuses, because Wrangler would create the database by itself.
console.log(`The deployed sign-in needs three things, in this order (each changes the Cloudflare account):

  1. The database:      npx wrangler d1 create remy-auth
     then put the printed database_id in wrangler.jsonc, in d1_databases beside "binding": "DB".
  2. Its tables:        npx wrangler d1 migrations apply DB --remote
  3. The signing secret: openssl rand -base64 32 | npx wrangler secret put BETTER_AUTH_SECRET

The showcase's notes demo keeps its own data in a second database, the same three steps without a secret:

  4. The database:      npx wrangler d1 create remy-auth-demo
     then put the printed database_id in wrangler.jsonc, beside "binding": "DEMO_DB".
  5. Its tables:        npx wrangler d1 migrations apply DEMO_DB --remote

The sign-in code is mailed through Cloudflare Email Service, from EMAIL_FROM in wrangler.jsonc, which
the send_email binding beside it must allow. Its domain has to be enabled for sending on the account:

  6. See what is:       npx wrangler email sending list
     and if it is not:  npx wrangler email sending enable <the address's domain>

A later migration is step 2 or 5 again, before the deploy that needs it.

Every branch's Preview uses the databases in wrangler.jsonc's previews section (remy-auth-preview,
remy-auth-demo-preview), migrated the same way with --preview, and its own BETTER_AUTH_SECRET
(npx wrangler preview base-config secret put BETTER_AUTH_SECRET): a session made there means nothing to production.`);

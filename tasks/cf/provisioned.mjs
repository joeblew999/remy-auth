// cf:deploy and cf:preview run this first: a binding in the Wrangler configuration that names no
// existing resource would make Wrangler create one during the deploy (its automatic provisioning).
// Creating a database, a namespace or a bucket is the owner's decision, so the deploy stops instead.
// The configuration read is the environment's being deployed: CLOUDFLARE_ENV, as the Cloudflare Vite
// plugin selects it at build time (cf:staging sets it), or the top level without one.
import { unstable_readConfig } from 'wrangler';

const environment = process.env.CLOUDFLARE_ENV || undefined;
const config = unstable_readConfig({ env: environment });
const missing = [
  ...(config.d1_databases ?? []).filter(db => !db.database_id).map(db => `D1 database ${db.binding} (${db.database_name ?? 'unnamed'}) has no database_id`),
  ...(config.kv_namespaces ?? []).filter(kv => !kv.id).map(kv => `KV namespace ${kv.binding} has no id`),
  ...(config.r2_buckets ?? []).filter(bucket => !bucket.bucket_name).map(bucket => `R2 bucket ${bucket.binding} has no bucket_name`),
];
if (missing.length) {
  console.error(`Not deploying${environment ? ` ${environment}` : ''}: Wrangler would create these by itself.\n${missing.map(line => `  ${line}`).join('\n')}\nCreate each on the owner's request and put its id in the Wrangler configuration (remy-auth: mise run auth:provision prints the steps).`);
  process.exit(1);
}

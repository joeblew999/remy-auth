/**
 * What an environment may do that production may not: the one per-environment policy table
 * (docs/content/dev/development.md). An unknown or missing environment is production, with everything
 * off. The Worker's `ENVIRONMENT` is "production" in wrangler.jsonc; a local `.dev.vars`
 * (`mise run auth:local`) says "local". The conveniences are listed in .plans/auth-service.md.
 */
const POLICY = {
  production: { captureMail: false },
  // Sign-in codes are written to the local D1's `local_mail` table instead of being mailed, and
  // /dev/mail reads them back (`mise run auth:mail`, the sign-in checks). The code is still Better
  // Auth's own, random and stored hashed; an account is made and a session started only by Better Auth.
  local: { captureMail: true },
} as const;

export type Convenience = keyof (typeof POLICY)['production'];

/** Whether `environment` allows `convenience`; anything but a listed environment answers as production. */
export function permits(environment: string | undefined, convenience: Convenience): boolean {
  const known = environment !== undefined && Object.hasOwn(POLICY, environment);
  return POLICY[known ? (environment as keyof typeof POLICY) : 'production'][convenience];
}

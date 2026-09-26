# Now: the open plans, in the order they close

Owner, 2026-09-26: "We desperately need to close outs plans ... work out the right order to close them
out because it's now gotten into a huge mess." One list, in order. Close an item only when it is on
main and live where that applies; then move its plan to [done/](done/) with a closing line. Big features
wait in [parked/](parked/). What broke along the way is in the [stability log](stability-log.md).

## In order

1. **Fonts** ([plan](fonts.md)): measure font bytes per language and decide the per-page budget,
   Persian's face and CJK (building now); Core Web Vitals per script on a throwaway Worker; remy-auth-app
   calls `fontChecks` at its next package upgrade. Then close.
2. **Content-Security-Policy enforced** ([observability](observability.md), security headers): the
   switch from report-only to enforcing (building now). No reports in 7 days of live traffic
   (2026-09-26) and every page hydrates with no violation in every language. Deploy enforcing, watch the
   reports a day, then close. HSTS max-age raised in the same step.
3. **Parts** ([plan](parts.md)): write "how to write a part" in the package README; leave-guard,
   search-params and observability stay package modules (decided, reasons in the plan). Then close.
4. **Publisher and consumers** ([plan](publisher-consumer.md)): the fewer-scripts review (each script:
   keep, or replace with a mise feature or upstream command); remy-auth-app runs the consumer contract
   set. Then close.
5. **Caching** ([plan](caching.md)): close as decided ("don't cache HTML yet": every page carries a
   per-response nonce and request ID); hashed assets are already immutable. Hash-based CSP for cacheable
   site pages goes to parked if wanted later.
6. **Observability** ([plan](observability.md)): one alert on failing answers (`event = ask`,
   `outcome = failed`) beside the two alert policies; then close.

## Owner only

- A native-speaker review of the ten newer languages' catalogs and the Spanish docs.
- The production origin (a custom domain) and Search Console.
- More docs languages: drop files into `docs/i18n/<locale>/` (the plumbing is done).

## Parked

[auth-service](parked/auth-service.md), [better-auth-ecosystem](parked/better-auth-ecosystem.md),
[gui-portal](parked/gui-portal.md): big features, not now (owner: "Not big feature stuff").

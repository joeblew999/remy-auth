# Shared GUI, internationalisation and search visibility

Status: agreed direction; framework integration and package details require implementation
verification. A minimal GUI proof now exists; authentication and full reuse rollout
remain planned. See [the runnable proof](../docs/gui.md).

## Evidence from existing Remy code

Read-only inspection of the sibling `remy-sport` checkout found:

- `components.json`: shadcn `base-nova`, Base UI primitives, CSS-variable theming,
  Lucide icons and no React Server Components requirement.
- `components-lock.json`: stone base, orange theme, Inter font; existing upstream
  component/theme maintenance commands live in `scripts/ops/ui.ts`.
- `package.json`: React 19, Vite, Tailwind 4 and Paraglide JS.
- `project.inlang/settings.json`: 27 configured locale tags, including `en`, `es`,
  regional Chinese variants and RTL languages. Configured is not the same as
  released or translation-reviewed; preserve the existing status/provenance model.
- `src/web/lib/i18n.tsx`: compiled Paraglide message functions. Translation
  completeness is enforced separately by `tests/repo/messages.test.ts`.
- `src/web/index.html`: empty React root and a generic title; `main.tsx` uses
  `createRoot`. This is evidence of a client-rendered entry, not a production
  indexing audit or proof that Google cannot render its JavaScript.
- `src/web/lib/locale.tsx`: browser globals, module-level locale state and sport
  domain/API dependencies. It cannot be imported unchanged into an SSR package.

## Outcome and rendering strategy

Reuse the established shadcn/Base UI components, theme and Paraglide conventions.
Fix public-page delivery separately. A shared component package alone cannot give
existing consuming apps crawlable initial HTML, routes or per-page metadata.

| Surface | Rendering and indexing |
| --- | --- |
| Public landing, help and product/content pages | SSR for changing content; prerendering for suitable static pages; indexable localized HTML |
| Login, signup and password reset | Client rendering is sufficient; noindex |
| Account, organization and administration screens | Client rendering is acceptable; noindex; server-side authorization for protected data |
| Other applications' protected screens | Keep their existing rendering strategy |

This project itself supports mixed rendering: choose the mode by route or section.
The same shared components and translations must work with both server and client
rendering. SSR is not a requirement for the entire auth portal. Server-side
authorization remains mandatory regardless of rendering mode.

Use React Router framework mode with Vite on Cloudflare for the new public-page
reference implementation, verifying supported rendering modes against pinned
versions. This is not a requirement to rewrite all existing apps or use React
Server Components. Assess Remy's existing route structure before migrating its
public pages; preserve URLs or provide permanent redirects. No bot-specific HTML
service or forward proxy is needed: humans and crawlers receive equivalent content.

Reuse Paraglide rather than introducing i18next. For SSR, use its supported server
middleware/request-local locale context. Browser globals must stay in browser
adapters; test concurrent locale requests for leakage and hydration consistency.
Public URLs determine the rendered language; stored preferences do not override
an explicitly localized URL.

## Shared package and hosted portal

Start with one versioned `packages/ui/` package with explicit component, theme and
locale/message exports. Use shadcn's supported shared-package layout and CLI,
not independently copied components in every consuming app. Keep React a peer
dependency and export styles explicitly; verify Tailwind includes package classes.
Split additional packages only when a real consumer or dependency boundary needs it.
The package name and publication destination remain to be selected.

Keep authentication screens in the centrally hosted Remy Auth portal initially.
Apps import shared controls and navigate to the portal in the same tab; OAuth/OIDC
returns them through their registered callback. No popup or separate window.
Persist the app's own route state before leaving. The portal uses the same UI
package and accepts validated language and light/dark preferences. A registered
client determines permitted branding; query parameters cannot inject arbitrary
CSS, logos or return destinations. Locale storage on one origin is not implicitly
shared with another origin.

Do not force other apps to bundle the portal's full auth-screen implementation.
Extract reusable auth views only when there is an actual embedded consumer.
Evaluate Better Auth UI against the Base UI variant, Paraglide, routing and
accessibility before adding it; the word "shadcn" alone does not prove compatibility.

The shared UI must not import sport vocabularies, oRPC endpoints, Cloudflare
bindings, database code, application routes or a global translation singleton.
Keep product data translation in its owning app. Share general controls, locale
metadata and common UI messages, with application-specific catalogs kept separate.

Use npm workspaces for the local proof, then test `npm pack` output in an isolated
consumer. Cross-repository consumers install versioned artifacts, not sibling
filesystem paths. No changes to remy-sport are included in this planning step.

## Internationalisation

Support Remy's full configured locale inventory without hardcoded EN/ES unions.
English, Spanish and Arabic are the verification set, not a permanent product
restriction. Carry locale tags, endonyms, direction, release
status and translation provenance through a single agreed source of truth when
extracting the shared package. Do not claim every configured language is reviewed.

Use compiled Paraglide message functions and native Intl formatting. Cover forms,
validation, errors, loading states, accessibility labels and page metadata.
Preserve plural/interpolation checks and a separate missing-translation check;
compilation alone can fall back to English. Test RTL and long strings. Match the
existing release policy rather than silently inventing a human-review gate.

Public translations have stable URLs such as `/en/about` and `/es/about`, with
crawlable language links. Include only available translations in search metadata.
Set document `lang` and `dir` in the initial HTML and preserve them on navigation.

### Dates, numbers, currency and direction

Status: decided and implemented 2026-09-24 on `/:locale/formats`, verified by
`tests/gui.spec.ts` and Lighthouse. The owner delegated these decisions to the agent
acting as Reviewer. Change a decision here first, then the code.

Sources: [Paraglide formatting](https://paraglidejs.com/formatting) and
[variants](https://paraglidejs.com/variants), whose `plural`, `number`, `datetime`
and `relativetime` declaration formatters the pinned compiler supports; Google's
guidance via `mise run web:guidance -- retrieve <id>` for Temporal
(`capture-location-agnostic-data`, `coordinate-global-events`) and logical CSS;
Lighthouse, whose `lang`, `hreflang` and charset audits cannot verify formatting.

| Decision | Choice and reasoning |
| --- | --- |
| 1. Locale metadata | `packages/ui/project.inlang/settings.json` is the only locale list; Paraglide's runtime exports it. Endonyms come from `Intl.DisplayNames` and direction from the locale's likely script through `Intl.Locale`, both in `@remy/ui/locale`, so no language is listed twice. `app/root.tsx` sets `dir` from it and the switcher shows the endonyms. Release status and provenance stay documented per catalog until a second consumer needs machine-readable metadata. |
| 2. Date and time model | Instants are `Date` values serialised as ISO 8601 UTC. Calendar dates are `YYYY-MM-DD` text, formatted with an explicit UTC zone so they never shift. Temporal is not adopted: it is not Baseline widely available and Google's fallback is an unpinned `esm.sh` polyfill. Revisit once a pinned package and Workers support are verified. |
| 3. Storage in D1 | ISO 8601 UTC text for instants and `YYYY-MM-DD` text for calendar dates: sortable, readable in queries, and the shape the Better Auth adapter writes for SQLite; verify against the pinned adapter when the auth tables are created. |
| 4. Display time zone | Server rendering formats in UTC and the format labels the zone (`timeStyle=long`). `request.cf.timezone` is not used: it is a network location, not the viewer's preference, and would make cached HTML vary. The viewer's own zone is rendered only in the browser after hydration (the formats page's "In your time zone" row); a stored user or organisation preference can later replace that. |
| 5. Currency | Money stays application-owned. The shared catalog provides the formatter (`number` with `style=currency`) and the page shows a sample amount. Apps store integer minor units with an ISO 4217 code and pass the major-unit value to the formatter; rounding follows Intl's per-currency fraction digits. |
| 6. Calendars and digits | Each locale's own conventions come from CLDR through the Intl Locale Info methods (`getCalendars`, `getNumberingSystems`, `getWeekInfo`) in `@remy/ui/locale-info`, evaluated in server loaders because those methods are not Baseline yet; formatting with a `calendar` or `numberingSystem` option is Baseline and runs anywhere. The page shows the primary calendar, the other calendars the locale uses (Arabic lists Coptic and Hijri variants), the numbering system, the hour cycle, the first day of the week and the weekend. No `-u-` override is applied. |
| 7. RTL | Arabic (`ar`) joins the verification set; its catalog is agent-authored and unreviewed. `dir` follows the locale, `app/styles.css` uses logical properties, and directional glyphs are aria-hidden CSS content that flips under `[dir="rtl"]`. shadcn stays `"rtl": false` because no component carries directional utilities yet; switch it and regenerate through the shadcn CLI when one does. |
| 9. Beyond dates, numbers and currency | The root URL negotiates the locale from `Accept-Language` with `Vary`, and every localized URL stays explicit. The formats page also shows compact numbers, units, currencies with different minor units, ordinals, value variants, interpolation, locale-aware sorting, region and currency names and date ranges; the demo has a localized form with validation and a plural confirmation; the sitemap carries `hreflang` alternates. Segmenter and DurationFormat wait for Baseline widely available. |
| 8. Verification | Playwright, with Node's Intl as the oracle, checks per locale: `dir`, endonyms, formatted instant, calendar date, relative time, decimal, percent, currency, language list and every plural category the sample counts produce; each catalog must define those categories; concurrent SSR keeps language and direction; hydration logs no errors; RTL mirrors the header and every page fits 375px. Lighthouse audits `/ar` and `/en/formats` as well as the earlier pages. |

Known limits: agent-authored translations until reviewed; no calendar or
numbering-system switch; no viewer time zone; no shadcn RTL utilities.

## SEO acceptance

- Public routes return their meaningful content, localized title/description,
  canonical URL and language metadata in the initial HTML response.
- Each translated page uses its own canonical URL. Equivalent translations have
  reciprocal, self-inclusive `hreflang` links and an appropriate `x-default` target.
  Only real, available translations appear in alternate links and sitemaps.
- Each consuming project owns its public origin, content, metadata and sitemap.
  Shared helpers must not canonicalize one project's pages to another project.
- Correct status codes, crawlable navigation, robots rules, XML sitemaps and
  applicable structured data are verified. Structured data describes visible content.
- Auth, account, callback and admin routes are excluded from indexing as appropriate.
  Protected data requires authorization regardless of robots or noindex directives.
  Personalized responses must not be placed in a shared public cache.
- Check accessibility, mobile layout, Lighthouse and Core Web Vitals. After a public
  deployment, validate indexing through Search Console and measure field performance.
- The pinned Chrome DevTools CLI runs Lighthouse's accessibility, SEO, best-practices
  and agentic-browsing categories only; upstream excludes Performance by design and
  offers `performance_start_trace` instead. Core Web Vitals therefore need a separate
  check (Lighthouse's own package, the trace tool, or PageSpeed Insights with an API
  key); choosing one is an open owner decision. Lighthouse also leaves ten
  accessibility checks and structured data as manual items, and reports the missing
  CSP, HSTS, COOP and frame-control headers as informative findings.

No framework or Lighthouse score guarantees Google indexing, rankings or rich
results. Acceptance is correct technical implementation and measurable behavior.

## First vertical slice and acceptance

1. Package the minimum shared controls and theme: button, field, input, card and
   language selection. Preserve upstream provenance and update workflow.
2. Build one real public page in English and Spanish, plus the hosted login flow
   and a protected account screen. Use the package through public exports.
3. Have the independent sample consume the packed UI package and use same-tab
   hosted login, preserving theme, language and return route. This proves actual
   reuse and navigation rather than screenshots of two separately styled pages.
4. Fetch the public URLs without JavaScript: assert localized visible text,
   title/description, self-canonical, reciprocal hreflang and crawlable links.
   Verify unknown routes return 404, redirects are intentional, and sitemaps
   contain only canonical public URLs. Check behavior without cookies.
5. Exercise browser hydration, locale switching, mobile/keyboard navigation,
   login/logout and denied access. Compare both apps' shared controls visually.
   Request different locales concurrently to catch server locale-state leakage.
6. After an explicitly authorized public deployment, use Search Console URL
   Inspection to check actual crawl/index eligibility, robots/WAF access and
   rendered content; monitor field performance. Local Lighthouse scores alone
   do not establish Google indexing or rankings.

Remy's current SEO gap requires a separate migration in that repository using
this reference pattern. Identify its public route inventory, preserve deep links,
and verify its data can be fetched by server loaders through public contracts.
The auth portal does not render other applications' public content for them.

## Primary references

- [shadcn shared-package layout](https://ui.shadcn.com/docs/monorepo)
- [Paraglide SSR](https://paraglidejs.com/server-side-rendering)
- [React Router rendering strategies](https://reactrouter.com/start/framework/rendering)
- [Cloudflare React Router integration](https://developers.cloudflare.com/workers/framework-guides/web-apps/react-router/)
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google multilingual site guidance](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Google localized page variants](https://developers.google.com/search/docs/specialty/international/localized-versions)

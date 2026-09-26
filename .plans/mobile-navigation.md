# Mobile navigation: a bottom bar on phones, the sidebar everywhere else

Status: open, 2026-09-26. Owner: "find the best shadcn way for our app to have a bottom navigation for
mobile ... I have no idea if we should retain the drawer for desktop users and use the bottom navigation
for mobile users ... Our app needs some more pages too to help show the navigation working."
Executor/Reviewer roles as in [plans and roles](../docs/content/dev/development.md#plans-and-roles).

## Words

- **Sidebar**: shadcn's `Sidebar`, what the app has now (the sidebar-16 block). On a phone it already
  opens as a **Sheet** (a panel sliding in from the side). This is what the owner calls "the drawer".
- **Drawer**, in shadcn, is something else: a panel sliding up from the bottom (Vaul). Not used here.
- **Bottom bar**: the row of 3–5 tabs fixed to the bottom of a phone screen (Material's "navigation bar",
  Apple's "tab bar").
- **Rail**: a narrow sidebar of icons only; shadcn's `Sidebar collapsible="icon"`.

## What the platforms say

| Source | Rule |
| --- | --- |
| [Material 3, navigation bar](https://m3.material.io/components/navigation-bar/guidelines) | 3–5 destinations; phones and small tablets only; never on desktop |
| [Material 3, navigation drawer](https://m3.material.io/components/navigation-drawer/guidelines) | Five or more destinations or two levels: a drawer; on phones swap it for a bar or open it modally; one primary navigation per breakpoint |
| [Android layouts](https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns) | "Avoid using the same bottom navigation bar across sizes": bar on phones, rail on large screens |
| [Apple tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | Navigation, not actions; fewer tabs is easier; a complex app adds a sidebar |

So: **keep the sidebar for tablets and desktops, add a bottom bar on phones**, 4 core tabs plus
**More**, and More opens the full sidebar (as its Sheet). One list feeds both, so they never disagree.

## Survey (how-we-work: choose tools by survey)

Criteria, weighted: stock shadcn (the owner's rule; 40), accessibility and RTL (20), fits TanStack Router's
active links (15), no new dependencies (15), maintenance (10).

| Candidate | Stock | A11y/RTL | Router | Deps | Maint. | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **A. Sidebar only** (today: Sheet on phones) | 40 | 20 | 15 | 15 | 10 | 100, but the platforms say phones want a bar: the Sheet's button is at the top, out of thumb reach |
| **B. Owned bottom-bar block from stock parts** (`useSidebar`, `useIsMobile`, Button styles, TanStack `Link`) + Sidebar | 30 | 18 | 15 | 15 | 8 | Ours is ~40 lines; everything it uses is shadcn's; More = `setOpenMobile(true)` |
| C. shadcn.io `navbar-mobile-bottom` block | 15 | 12 (assumed) | 8 | 15 | 5 | Third-party site, not ui.shadcn.com; Next.js-shaped; its registry answers 401 "Token required for all downloads" (checked 2026-09-26): needs an account, so not buildable here |
| D. 21st.dev `bottom-nav-bar` | 10 | 10 (assumed) | 8 | 5 | 3 | Framer Motion; licence "unknown" on its page |
| E. shadcn `Tabs` restyled as a bar (21st.dev `tabs-08`) | 25 | 8 | 5 | 15 | 8 | Tabs are for views in a page (Apple, Material), wrong role for navigation |

shadcn has no bottom navigation: requests [#4398](https://github.com/shadcn-ui/ui/issues/4398) and
[#8847](https://github.com/shadcn-ui/ui/issues/8847) are open; a maintainer's view there: a mobile-only
pattern. **Choice: B. Runner-up: A** (C needs a shadcn.io account). Switch when shadcn ships its own (watch
#8847): then its block replaces ours through `shadcn add`, like sidebar-16.

## Design (B)

- **Phones** (below shadcn's `useIsMobile` breakpoint, 768 px): the bottom bar, fixed, above the home
  indicator (`env(safe-area-inset-bottom)`), 48 px touch targets, `aria-current="page"` on the active tab,
  labels always shown, icons mirrored where they point (RTL). The header's sidebar button goes on phones:
  More is the one way in.
- **Tablets and desktops:** the sidebar as now, collapsing to a rail (`collapsible="icon"`).
- **One list** of destinations, each marked core or not, in the package; the sidebar shows all, the bar
  the core ones and More.
- Lives in the shared package as an owned block (`packages/ui/src/blocks/bottom-nav`), so remy-auth-app
  gets it on the next release.
- Checks (few, ours only): on a phone viewport the bar shows the core tabs and More opens the sheet with
  everything; on desktop no bar. Lighthouse and axe run as now.
- New strings are English only while translation is frozen (now.md step 0).

## Pages to add (real, working, what Remy does)

Today: Overview, Formats, Demo (reservations), Location. Proposed:

| Page | What it shows | Real? |
| --- | --- | --- |
| Clock | Time now in chosen time zones (Intl), linking the site's time-zone pages | yes |
| Settings | Language, theme, currency and number defaults (the preferences the app already keeps) | yes |
| Account | Signed-in state and sessions; an honest empty state until the auth service ([parked](parked/auth-service.md)) | placeholder |
| Help | The product guide, Ask AI and the MCP servers for the app's users | yes (links) |

Bar (proposed): **Overview, Formats, Clock, Account, More**. More: Demo, Location, Settings, Help, the
docs, back to the site.

## Owner decisions, 2026-09-26

1. Bar: **Overview, Formats, Clock, Account, More** (the recommendation).
2. New pages: **Clock, Settings, Account**. Not Help (the sidebar already links the guide).

## Done, 2026-09-26

B built: `packages/ui/src/app-nav.tsx`, `blocks/bottom-nav`, the sidebar collapsing to icons, Clock,
Settings and Account; `appNavChecks`. Seen at 390 px (English, Arabic), 900 px (rail) and 1280 px.
Left: remy-auth-app adds the three routes when it takes the next release; the new strings wait for
translation step 4.

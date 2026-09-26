# Architecture stability log: what the pump found

Owner, 2026-09-25: "We are finding the limits to the architecture stability. By pumping hard we find out
and we find out how well the code boundaries hold up!" Many agents code in parallel, deploys run no tests,
a full run (tier 4) catches what broke. Each break is logged with the boundary it crossed.

| Date | What broke | Boundary crossed | Held or leaked | Fix |
| --- | --- | --- | --- | --- |
| 09-25 | `cf:preview` waited for `/en/docs`, which only remy-auth has | shared tasks assumed one app's pages | leaked (publisher → consumer) | wait on `/healthz`, which the package gives every app |
| 09-25 | Translated docs broke the shared sitemap check | shared checks assumed English-only docs | leaked, caught by the translation agent | `publicPageChecks({ oneLanguage: { translations } })` |
| 09-25 | Replacing the search dialog left its checks behind (2 failures) | UI change without its checks | leaked, caught by the full run | checks follow the inline box |
| 09-25 | Docs page layout change broke translation/search checks (4 failures) | two agents changing the docs area in parallel | leaked, caught by the full run | fix agent |
| 09-25 | Header importing the search box would have put it in every page's bundle | route-level code splitting | held (caught by review before deploy) | the id in its own module |
| 09-25 | Answers mixed English and Spanish citations | AI Search index shared across languages | leaked, seen live by the owner | folder filter per language |
| 09-25 | English docs edited by a tidy-up agent left the Spanish translation behind (3 failures) | translations vs their source | leaked, caught by the full run's heading-id check | Spanish caught up; translation drift needs a check before merge |
| 09-25 | Choosing a search result left the query in the box, so results covered the new page | component state across navigation | leaked, found by the rewritten check | clear the box on a plain click |
| 09-25 | `project:test:only` ignored `CHECK_LOCALES` | tier task defaults | leaked (tooling) | caller's `CHECK_LOCALES` wins |
| 09-25 | `field.tsx` lost shadcn's `"use client"` after an agent removed other components | shadcn CLI regenerating shared files | leaked, caught by `ui:verify` | regenerated with `ui:components` |
| 09-25 | A background agent could not run the test tier (its permission check refused it) | agent permissions vs test tasks | leaked (process) | full runs run as the lead's own background command |
| 09-25 | Parts (pass 2) and package moves both reworked the sitemap route and the app's check calls, in opposite directions (route into a part vs a shared builder; checks split into parts vs one serverAppChecks) | two agents given overlapping scopes on the same files | leaked: a design clash, not a text conflict | one agent reconciles; lesson: give parallel agents disjoint files |
| 09-25 | The recipe agent's English `tasks/README.md` edit left the Spanish behind again (1 failure) | translations vs their source, second time | leaked, caught by the full run | `docs:translations` in tier 0 (`project:check`) now catches it before merge |
| 09-25 | Releasing 0.11.0 broke `npm install`: the contract package still required remy-ui `^0.10.5`, so npm looked on the public registry | package versions vs their peers in one workspace | leaked, caught by the release gate's `npm ls` | contract 0.2.0 requires `^0.11.0`; bump peers with the package |
| 09-25 | `project:test:cwv` removed its log before reading the check Worker's name: the Worker was left behind and the release step failed after every check passed | cleanup code in a shared task | leaked, caught by the release | read, then remove; keep the run's exit status |
| 09-25 | remy-auth-app pinned contract 0.1.0, which was never published | package pins vs what is published | leaked, caught by the upgrade | contract 0.2.0 published with 0.11.0 |
| 09-26 | Layout inventory: 14 hidden assumptions between shared tasks/package and apps (no smoke spec in remy-auth-app, undocumented `CF_VERSION_METADATA` and Worker wrapper for cf:wait, remy-auth's GitHub link in the shared header, skills drift unchecked in consumers, copied files, version pin vs include ref unchecked) | publisher ↔ consumer layout | leaked, found by inventory | the layout contract and `project:layout` |
| 09-25 | Five merges into `CHANGELOG.md` and `now.md` conflicted | shared plan and changelog files | held (text conflicts only, no code) | resolved at merge |
| 09-25 | Fonts, formats, parts, caching, sidebar, contracts merged in parallel | package vs app, parts, route files | held: typecheck clean, every page 200 live | — |

Full run (tier 4) on 6fca2c1, 2026-09-25: 308 passed, 1 skipped, every language, after the fixes above.

Release 0.11.0, 2026-09-25: full gate 324 passed, the check Worker 101 passed, Core Web Vitals 4 of 4; remy-auth-app on 0.11.0: 167 passed. Both apps live.

What holds so far: code boundaries (package vs app, parts, routes) survive parallel work; merges
conflict only in shared text files. What leaks: assumptions baked into *shared* tasks and checks about one
app's shape, and checks that don't move with the code they check.

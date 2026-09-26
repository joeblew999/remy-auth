# Translations through upstream tools, the same in every app

Status: analysed (tooling first) 2026-09-26; recommendation below. Folds in
[issue #4](https://github.com/joeblew999/remy-auth/issues/4) (a translation-pipeline proposal, closed into
this plan) and everything the owner asked about translations on 2026-09-25 and 26.

## Goal

Translating the UI and the docs, and checking that translations are complete and current, is done by
**upstream tools run through shared mise tasks**, identically in every app on the package. Our own
translation code and our own translation checks go. What remains of ours is a layout convention and
one-line mise tasks.

## The owner's words

- "The gui and docs are in many languages. They always drift out. What current tools expressed in the
  mise currently help?"
- "Well there is an interplay here. Sure you can write tasks, but the repository structure has a bearing
  too, and so does mise depends."
- "We do multi agent development and agents will be constantly changing these sources too. So a mise
  depends might get concurrent problems?"
- "And then of course the consuming repo uses the same tools and needs to have the exact same folder
  layout etc too." / "It's not just docs! It's everything."
- "Some mise tasks are dependent on scripts ... It's worth asking if we could get rid of scripts if the
  code or code structure was different, or if we used a tool."
- "You need to get to the point that your checking uses mise and the underlying tool!"
- On issue #4: "It must work for all consumers and so be mise and tooled in ... done by Gemini so it's
  likely to be a little wrong in some ways and out of date."
- Earlier: "The docs translation. Is this also paraglide based or what?", "Multi language will be a
  bitch", "God help us when we want docs in other languages".
- "This needs to be well done, because I already raised a plan before about how our translation tools and
  node need to be such that custom work and checking has to be gone!! Fold it all in properly now."

## What we have today, and what it costs

Built 2026-09-26 as a stopgap; every line below is ours and is meant to go:

| Piece | Ours | Lines | Does |
| --- | --- | --- | --- |
| `tasks/i18n/i18n.mjs` (+ 3 bash wrappers) | yes | 244 + 18 | docs staleness via a provenance line with the English blob sha; UI catalog key and placeholder parity; `i18n:translate` prints the English diff; `--mark` |
| Provenance comment in each translated doc + `remarkDropProvenance` in `source.config.ts` | yes | ~15 | lets the check know which English a translation came from |
| `scripts/docs-publish.mjs` | yes | 53 | puts English and translated docs into R2 for AI answers, deletes stale objects (Wrangler cannot list a bucket) |
| `scripts/docs-questions.mjs` | yes | 23 | search-only questions per page |
| The translating itself | an agent | — | reads `i18n:translate`'s output and edits files; no tool |

Upstream already in use: Paraglide (catalogs, compile, runtime fallback to English), inlang's
`project.inlang` settings and message-format plugin, Fumadocs' i18n (`defineI18n`, per-language pages and
search), mise `sources`/`outputs` (`ui:generate` skips when unchanged).

## Constraints the result must meet

- **Every app, same shape:** shared mise tasks and pinned tools, no global installs; the layout is part of
  the layout contract (`project:layout`); an app with nothing to translate passes cleanly.
- **One writer:** feature agents write English only; translating is one serialized step on main after
  merges (docs/how-we-work.md, "Translations: one writer"). Parallel agents must never race on
  translations.
- **Formats kept intact:** Markdown structure (code blocks, links, heading ids with `[#english-id]`),
  Paraglide placeholders and plural variants.
- **Checks by tools:** "complete and current" is reported by an upstream tool through a mise task, a
  warning while pumping and an error at release; no custom checker.
- **13 languages** including right to left (ar, fa, he), CJK (ja, zh-TW), Thai, Ethiopic; quality a
  native reader could accept; cost known; reviewable diffs.

## Questions the analysis must answer

0. **What our stack already offers** first: Paraglide/inlang, Fumadocs i18n, mise `sources`/`outputs`,
   Cloudflare Workers AI; only the gaps get new tools.

1. **UI catalogs:** does the inlang ecosystem (current `@inlang/cli`, the inlang SDK, Paraglide, Fink,
   Sherlock, lint rules) now provide (a) machine translation of missing keys and (b) a completeness check
   (missing keys, placeholders)? Found 2026-09-26: `@inlang/cli` 3.3.8 has only `lint` and `validate` for
   settings; verify on current versions and inlang's docs. If yes, both jobs of `i18n.mjs` for catalogs go.
2. **Docs:** is there a maintained tool that translates Markdown/MDX while keeping structure, and knows
   what changed since the last translation (translation memory, source hashes), so the provenance line and
   the staleness check go? Candidates to check, none verified: issue #4's md_translate, md-translator,
   json-translator, Ollama pipelines; also Fumadocs' own i18n guidance, Crowdin/Lingo.dev-style CLIs,
   and whether an LLM step through a pinned CLI is the honest answer.
3. **Who translates:** a machine-translation engine, an LLM (which, where it runs, cost), or an agent
   step, and how the one-writer step invokes it through mise.
4. **Layout:** does the chosen tool dictate a layout (e.g. `file.es.md` beside the English, or its own
   folder)? The layout contract follows the tool, not the other way round.
5. **Docs for AI answers:** can the translated docs reach R2 without `docs-publish.mjs` (an upstream
   sync, or AI Search crawling the site once there is a domain)?
6. **Concurrency:** confirm the result keeps translations single-writer across worktrees and merges.
7. **What moves where:** anything that must stay code goes into the parked
   [remy CLI](parked/remy-cli.md), not into loose scripts.

## Analysis, tooling first (2026-09-26)

The owner rejected the first analysis the same day ("That's not really a good plan result"; "The tooling
is key"). It had three tools and two paid keys, glued the layout (English symlinked into `docs/i18n/en`,
a `jq` line for locales), ignored what we already run, left plurals per locale unsolved, and chose
`lingo.dev`, which overwrites manual fixes. This analysis starts from the tooling.

**How it was done.** Two surveys: DETECT (knowing what is missing, stale or short of plural categories)
and TRANSLATE (doing the translating). They used mise 2026.9.12 and node 26.10.0, with `--help` runs and
installs in temp directories outside the repo, and offline runs under `sandbox-exec` with outbound
network denied (curl exit 7 confirmed the block). Nothing was written in the repo. A point marked
**assumed** was not verified.

**Criteria, in order:** mise installs and pins every tool; configured once in the shared `tasks/`,
identical in every app that includes it; each task a short run over the tool; fits today's layout
(`docs/i18n/<locale>/<repo path>`, `packages/ui/messages/<locale>.json` through `project.inlang`) with
no glue; checks offline with no key; replaces our code rather than sitting beside it; fewest tools.

### Findings that decide it

- **mise shares tool pins through includes.** A task-level `tools = {…}` inside a `task_config.includes`
  file installs and activates its tools. In an isolated directory the task saw `jq-1.8.1` and
  `i18n-check 0.9.5` from their install paths, while outside the task only shims existed. So pins live
  once, in the shared `tasks/`, and every app gets the same versions. (mise's web docs, as summarised by a
  fetch, said includes do not support `tools`; the run shows they do.)
- **Staleness is already in git.** A translation is stale when the English changed after the
  translation's last commit: `git diff --quiet $(git log -1 --format=%H -- <translation>) -- <english>`.
  Tested: a translation touched on main *before* a merge brought in an English edit is reported stale,
  because git compares content, not dates; uncommitted English edits are caught. This replaces the
  provenance line, `remarkDropProvenance`, `--mark` and the staleness half of `i18n.mjs`, and the same
  `git diff` is exactly what the translator needs.
- **Catalog keys whose English changed** are found the same way: `git show <last commit of
  <locale>.json>:./en.json` against the current `en.json`, with one `jq` expression. Tested on synthetic
  data (changed, variant-changed and new keys flagged). The real repo is clean, because every catalog was
  last committed together in `70981d6`. This replaces the first analysis's people-only rule "a changed
  meaning needs a new key".
- **`@lingual/i18n-check` 0.9.5** (`npm:`) checks missing keys and placeholders offline and exits 1.
  On our real catalogs it passes once the plural messages are ignored; the ignore list is generated from
  `en.json` by `jq`, not kept by hand. Breaking `de` (dropping `{zone}`, deleting a key) still exits 1. It
  cannot see plural categories (deleting ar `few`/`many` passes) and does not report extra keys by
  default.
- **No upstream tool checks plural categories per locale.** Each of these passed a broken ar plural:
  i18n-check, `formatjs verify --structural-equality` 6.16.32, Paraglide 2.25.4 compile (exit 0), and
  `inlang validate`/`lint` 3.3.8 (settings only). localheroai/cli's CLDR check
  ([PR #85](https://github.com/localheroai/cli/pull/85)) is unreleased and does not read inlang files. At
  runtime, Paraglide's compiled `ar_apps_count` tests each category with `===` and ends in
  `return "apps_count"`, so a missing `few` shows the raw key.
- **Paraglide's own format makes the plural check small.** A message declares its plural as
  `local countPlural = count: plural` (optionally `type=ordinal`). A 20-line node check reads that
  selector and requires every category `new Intl.PluralRules(locale, {type}).select(n)` returns for n
  from 0 to 1000. Sampling real numbers avoids flagging es `many`, which only applies to millions.
  Prototype, run offline: the real catalogs pass (exit 0); ar with `few`/`many` removed prints
  `ar.json apps_count: countPlural lacks few, many` (exit 1). Node 26 gives es one, many, other; ar zero,
  one, two, few, many, other; he one, two, other; pl one, few, many, other; th, ja and zh-TW other only.
- **A runtime safety net from Paraglide itself.** Paraglide's docs (https://paraglidejs.com/variants) use
  `=*` as the catch-all, and a `*` variant compiles to an unconditional `return`. Writing `=*` instead of
  `=other` means a missing category shows the general form, not the raw key. The check counts `*` as
  `other` only, never as covering the other categories.
- **The translator is already here.** Claude Code is in the mise registry as
  `aqua:anthropics/claude-code` and installs with a checksum (2.1.282; 2.1.283 is hidden by
  `minimum_release_age`). Headless `claude -p` on a scratch inlang project took 38.8 s with the
  subscription login and no key. ar `apps_count` came back with all six categories and es with one, many
  and other; declarations, selectors and `{countText}` were kept byte for byte; a hand-reviewed key was
  untouched; each file kept its formatting. `--bare` must not be used ("Anthropic auth is strictly
  ANTHROPIC_API_KEY … OAuth and keychain are never read").
- **What does not earn a place:**
  - `@inlang/cli` 3.3.7 `machine translate`: catalogs only. Its providers are Google (paid key), DeepL
    (paid key, no am) or a default community service (translate.demosjarco.dev: Workers AI on someone
    else's account, 0 stars, no SLA; endpoints hardcoded, so it cannot point at our account). It gave ar
    only English-shaped one/other, broke es (`"countPlural=other": "{countText} "`), rewrote files with
    `$schema` and minified ar. PostHog and Sentry are baked in with no off switch. It would add a tool
    and remove nothing, since the agent is still needed for docs and plurals.
  - `lingo.dev` 0.138.8, even for detection only (`lockfile -f`, `run --frozen --pseudo -y`, offline):
    it needs the `docs/i18n/en` symlinks, `i18n.json` and `i18n.lock`; one lock covers all locales
    (marking es current marks ar current); a Spanish file with a section deleted still passed `--frozen`;
    `status` always exits 0; 464 packages, 36 MiB. It has no inlang format.
  - `@lobehub/i18n-cli` 1.27.0 writes `file.{locale}.md` beside the source (glue to fit our layout) and
    translates every JSON string. gtx-cli needs a General Translation key.
  - Workers AI through wrangler: there is no `wrangler ai run`. REST with `wrangler auth token` works, but
    m2m100 turned `{provider}` into "proveedor" and has no zh-TW, and gpt-oss-120b returned no content.
    gemma-4-26b kept Markdown intact, but splitting files, keeping manual fixes and writing our layout
    would all be new code of ours.
  - inlang/lix: nothing in the toolchain checks messages. Fumadocs: routing and search only, unchanged.

### Recommendation: git, jq and i18n-check detect; the pinned agent translates

**Tools**, pinned once as task-level `tools` in the shared `tasks/i18n.toml` (replacing the file tasks in
`tasks/i18n/`), so every app that includes `tasks/` gets the same versions:

| Tool | mise pin | Job | New? |
| --- | --- | --- | --- |
| git | already on every machine | docs and catalog staleness | no |
| node | `node = "26.10.0"` (app `[tools]`, already there) | `Intl.PluralRules`, `node --test` | no |
| jq | `"aqua:jqlang/jq" = "1.8.1"` | catalog staleness, generated ignore list | yes |
| i18n-check | `"npm:@lingual/i18n-check" = "0.9.5"` | catalog missing keys, placeholders | yes |
| Claude Code | `"aqua:anthropics/claude-code" = "2.1.282"` | translating (the one writer) | pinned now; already our translator |

**Shared tasks** in `tasks/i18n.toml`. The two detect tasks are a few lines of shell each, not one line:

```toml
["i18n:docs"]
description = "Docs translations missing or stale against their English (git history); exit 1 if any"
dir = "{{config_root}}"
run = '''
[ -d docs/i18n ] || exit 0
[ "$(git rev-parse --is-shallow-repository)" = false ] || { echo "needs full history (fetch-depth: 0)"; exit 2; }
bad=0
for e in $(node --input-type=module -e "console.log((await import('./$I18N_DOCS_TABLE')).docsTable.map(r=>r.file).join(' '))"); do
  for l in $(ls docs/i18n); do t=docs/i18n/$l/$e
    [ -f "$t" ] || { echo "missing $t"; bad=1; continue; }
    c=$(git log -1 --format=%H -- "$t"); [ -n "$c" ] && git diff --quiet "$c" -- "$e" || { echo "stale $t"; bad=1; }
  done
done
exit $bad
'''

["i18n:catalogs"]
description = "UI catalogs: missing keys and placeholders (i18n-check); keys whose English changed since the locale was translated (git + jq)"
dir = "{{config_root}}/{{env.I18N_MESSAGES}}"
tools = { "aqua:jqlang/jq" = "1.8.1", "npm:@lingual/i18n-check" = "0.9.5" }
run = '''
ls *.json | grep -qv '^en.json$' || exit 0
bad=0
i18n-check -l . -s en -f icu -r summary -i $(jq -r 'to_entries[]|select(.value|arrays)|select(tostring|test(": plural"))|"\(.key).*"' en.json) || bad=1
for f in *.json; do [ "$f" = en.json ] && continue
  out=$(git show "$(git log -1 --format=%H -- "$f")":./en.json | jq -r --slurpfile new en.json --arg f "$f" '. as $old|$new[0]|to_entries[]|select(.value != $old[.key])|"stale \($f) \(.key)"')
  [ -z "$out" ] || { echo "$out"; bad=1; }
done
exit $bad
'''

["i18n:plurals"]
description = "Each locale has the CLDR plural categories its Paraglide plural selectors need (Intl.PluralRules)"
run = "node --test {{config_root}}/tasks/i18n/plurals.test.mjs"

["i18n:check"]
description = "Missing, stale, placeholder and plural gaps; a warning while coding, an error with I18N_STRICT=1"
run = "mise run i18n:docs ::: i18n:catalogs ::: i18n:plurals || [ -z \"$I18N_STRICT\" ]"

["i18n:translate"]
description = "The one writer, on main only: the agent fixes exactly what i18n:check reports; you review and commit"
dir = "{{config_root}}"
tools = { "aqua:anthropics/claude-code" = "2.1.282" }
env = { DISABLE_TELEMETRY = "1", DISABLE_ERROR_REPORTING = "1", CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1" }
run = '''[ "$(git branch --show-current)" = main ] || exit 2; r=$(I18N_STRICT=1 mise run -q i18n:check 2>&1) && exit 0; echo "$r" | claude -p --append-system-prompt-file tasks/i18n/translator.md --model sonnet --tools Read,Edit --permission-mode acceptEdits --no-session-persistence'''
```

The git, jq, i18n-check, plural and `claude -p` runs above were verified. The `:::` parallel form of
`mise run`, the `I18N_STRICT` handling and the one-line guard in `i18n:catalogs` are **assumed** and get
proved in step 1 of the plan.

**Config lives in one shared place.** Tools, pins, tasks, the plural test and the translator prompt are
in `tasks/`, included by git reference. An app's `mise.toml` keeps only `node` and two `[env]` inputs:
`I18N_DOCS_TABLE = "src/docs/table.js"` (kept, since the docs table stays the one list of docs) and a new
`I18N_MESSAGES = "packages/ui/messages"`. Locales come from the layout itself (`docs/i18n/<locale>/`,
`messages/<locale>.json`, which `project.inlang` already drives). There is no `i18n.json`, no lockfile,
no symlinks and no generated config.

**What of ours is deleted:**

- `tasks/i18n/i18n.mjs` (244 lines) and the wrappers `check`, `status` and `translate` (18 lines).
- The `<!-- translated-from: … -->` provenance line in the 13 files under `docs/i18n/es/`.
- `remarkDropProvenance` and its `remarkPlugins` entry in `source.config.ts` (about 12 lines).
- The `--mark` step, and its text in docs/how-we-work.md ("Translations: one writer") and
  `tasks/README.md`. Committing the translation *is* the mark.

**What remains ours:**

- About 10 lines of shell over git and 6 over i18n-check and jq, inside the TOML.
- The 20-line plural test, `tasks/i18n/plurals.test.mjs`. It is a `node:test` in the test gate, not a
  loose script, and moves into the [remy CLI](parked/remy-cli.md) when that exists.
- `tasks/i18n/translator.md`, a prompt, which is prose.
- `i18n.mjs`'s heading-count check is dropped with no replacement; heading structure is left to review.

**Keys and money:** checks need no key and no network, and cost nothing. Translating uses the Claude
subscription login already on the machine: no API key and no extra money (**assumed** within the
subscription's limits for a batch). A machine with no login would need `CLAUDE_CODE_OAUTH_TOKEN` or an
API key (**assumed**); the writer is local, so that does not arise today. That the three telemetry
variables switch telemetry fully off is **assumed**, from Claude Code's docs.

**Plurals per locale:**

1. **Detect:** `i18n:plurals` reads each `local X = n: plural [type=ordinal]` declaration and requires the
   categories `Intl.PluralRules` produces for that locale and type. A missing category is an error at
   release, like a missing key.
2. **Translate:** the check's line (`ar.json apps_count: countPlural lacks few, many`) is exactly the
   agent's instruction. Verified: the agent fills all CLDR categories while keeping declarations and
   placeholders.
3. **Runtime:** plural messages use `=*` instead of `=other`, so a gap shows the general form rather than
   the raw key while a translation is pending.

**An app with nothing to translate:** `i18n:docs` exits 0 with no `docs/i18n/`; `i18n:catalogs` exits 0
when only `en.json` exists; the plural test finds no declarations and passes; `i18n:translate` sees a
clean check and exits 0 without starting the agent. A task-level tool installs only when its task runs.

**The one-writer step:**

- Feature agents write English only and run `i18n:check`, which only reads, is offline and runs in any
  number of worktrees in parallel. No check depends on `i18n:translate`, so `depends` never starts a
  writer.
- After merges, on `main`, one person or agent runs `mise run i18n:translate`. It refuses other branches
  and pipes the check report to `claude -p`, which edits in place with `Read` and `Edit` only. For a stale
  docs file the agent also needs the English diff: either the task grants read-only `Bash(git diff:*)`
  (flag form **assumed**) or the docs check prints the diff command; step 3 of the plan settles which.
- A person reviews the diff and commits. That commit makes the translation current. Manual fixes survive
  because the agent edits from a diff and never regenerates whole files (verified for catalogs; for
  Markdown **assumed**, held by the prompt).

**Limits, stated honestly:**

1. Any commit to a translation file counts as "translated", so a formatting sweep over `docs/i18n/`
   would hide staleness. The one-writer rule covers it.
2. Git staleness needs full history. The task refuses a shallow clone. `google.yml` would need
   `fetch-depth: 0` if the check ever runs in CI. Cloudflare Workers Builds clones are **assumed**
   shallow, so the check stays a local gate.
3. A renamed English file shows as missing in every locale until its translations are moved.
4. Agent output is not deterministic; review is the gate, as today.
5. Quality in am, fa, th, pl, tr and he is not measured; a native reader spot-checks them.

### Runner-up: lingo.dev detects docs, inlang machine-translates catalogs, the agent does the rest

`i18n:catalogs` and `i18n:plurals` stay the same.

- **Docs detection** becomes `tools = { "npm:lingo.dev" = "0.138.8" }` with
  `run = "lingo.dev run --frozen --pseudo -y"`. It is offline and exits 1 on "Source file has been
  updated" or "Target file is missing translations". `lingo.dev lockfile -f` after translating replaces
  `--mark`.
- **Catalog translation** adds `"npm:@inlang/cli" = "3.3.7"` with
  `run = "inlang machine translate --project ./project.inlang -n"`.
- **Docs and plural categories** still go to the agent.

### Scores and total cost

Tooling first; 5 is best in each column.

| | mise-pinned, shared | New tools / keys | Layout, no glue | Offline checks | Plurals per locale | Keeps manual fixes | Replaces our code | Total /35 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Recommendation** | 5 | 5 (+2 small CLIs / 0) | 5 | 5 | 5 (checked, filled, `=*` fallback) | 4 | 4 (shell in TOML, 20-line test) | **33** |
| Runner-up | 5 | 2 (+4 / 0, or +1 paid Google key) | 1 (symlinks, `i18n.json`, `i18n.lock`) | 4 (misses shortened files, one lock for all locales) | 3 (inlang writes English-shaped plurals; the test catches them) | 4 | 3 (adds config files) | **22** |

| Total cost | Recommendation | Runner-up |
| --- | --- | --- |
| Tools | git, node (present); jq, i18n-check (new); Claude Code (now pinned) | the same, plus lingo.dev (464 packages) and `@inlang/cli` |
| Keys | none | none, or a paid Google key to avoid a stranger's service |
| Money | none for checks; translating within the Claude subscription | the same, plus Google above its free tier |
| Telemetry | Claude Code's, switched off through task env (**assumed** complete) | plus inlang's PostHog and Sentry, which cannot be turned off |
| Ours left | about 16 lines of shell in TOML, a 20-line test, a prompt | the same test and prompt, plus `i18n.json`, `i18n.lock` and the `docs/i18n/en` symlinks |
| Deleted | `i18n.mjs`, wrappers, provenance lines, `remarkDropProvenance`, `--mark` (about 280 lines) | the same |

### Docs for AI answers, and concurrency

These do not depend on the tool choice and are unchanged from the first analysis:

- **`docs-publish.mjs` stays until there is a domain.** AI Search's website source needs "a source URL on
  a domain that you have onboarded onto the same Cloudflare account"
  (https://developers.cloudflare.com/ai-search/configuration/data-source/website/parse-types/), and the
  site is on `workers.dev`. Then the website source replaces the bucket and the script is deleted.
- **Concurrency:** only `i18n:translate` writes `docs/i18n/<locale>/` and `messages/<locale>.json`, and
  only on `main`; checks only read. With no lockfile there is nothing shared to conflict across branches.
  A branch that edits English is reported stale until the next translate run on main, which is the
  intended warning.

## Plan of work

1. **Prove the checks on this repo** (no network, no key):
   - Add `tasks/i18n.toml` with `i18n:docs`, `i18n:catalogs`, `i18n:plurals` and `i18n:check`, the
     task-level pins for jq and i18n-check, and `I18N_MESSAGES` in `mise.toml`.
   - Turn the plural prototype into `tasks/i18n/plurals.test.mjs`.
   - Show each check failing on a deliberate break (English edit after a translation, dropped `{zone}`,
     deleted key, ar `few` removed) and passing on the real tree, all in a network-denied run.
2. **Replace, in the same change:**
   - Delete `tasks/i18n/i18n.mjs` and its three wrappers, the provenance lines in `docs/i18n/es/`,
     `remarkDropProvenance` and its `remarkPlugins` entry.
   - Switch plural messages from `=other` to `=*` and confirm they compile and render in ar, he, ja and pl.
   - Rewrite how-we-work "Translations: one writer" (the commit is the mark; `=*` for plurals) and
     `tasks/README.md`.
3. **Prove the writer:** add `i18n:translate` with the pinned Claude Code and `tasks/i18n/translator.md`.
   Settle how the agent gets the English diff (the prompt, or read-only `Bash(git diff:*)`). Run it on main
   for an English docs edit and for a new plural message; confirm the check goes green, manual fixes
   survive in Markdown, and telemetry is off.
4. **Translate the rest:** run `i18n:translate` for the other 11 locales in batches; a native reader
   spot-checks am, fa, th and he.
5. **Share:** prove it in remy-auth-app, which includes `tasks/` by git ref, including an app with nothing
   to translate passing and the pinned tools installing on first use.
6. **Later, once there is a domain:** point AI Search at the site's sitemap and delete `docs-publish.mjs`
   and the R2 bucket.

## Issue #4 as filed

Kept for reference; the analysis decides what of it holds.


**Type:** Chore / Tooling  
**Status:** Open  

## Description
We need to integrate a free, automated CLI tool to handle translations across the repository. The tooling must reliably parse and translate two distinct file types without corrupting their structural constraints:
1. **Paraglide JSON:** Must preserve strict key structures and Inlang interpolation syntax (e.g., `{name}`).
2. **Markdown:** Must preserve structural syntax (YAML frontmatter, fenced code blocks, formulas, and relative URL links).

## Proposed Solutions

### Option 1: Format-Specific CLI Tools
This approach uses dedicated tools for each file type to ensure syntax safety.

**For Paraglide JSON:**
* **`@inlang/cli` (Recommended):** Natively reads the `project.inlang` config and translates missing keys without breaking the AST.
  * *Source:* [Inlang CLI](https://inlang.com/c/cli)
  * *Command:* `npx @inlang/cli machine translate`
* **`json-translator`:** A generic Node CLI that bypasses Inlang config and translates raw dictionaries using free Google Translate endpoints.
  * *Source:* [json-translator on npm](https://www.npmjs.com/package/@parvineyvazov/json-translator)
  * *Command:* `json-translator` (interactive setup)

**For Markdown:**
* **`md_translate` (Python):** Parses Markdown, translates prose via free endpoints (Google/Bing/Yandex), and reconstructs the file. 
  * *Source:* [md-translate on PyPI](https://pypi.org/project/md-translate/)
  * *Command:* `md-translate ./docs -F en -T es -P google -N`
* **`md-translator` (Node):** Swaps Markdown constructs for placeholders before translation, ensuring 100% format preservation. Can connect to free LibreTranslate or local LLM endpoints.

### Option 2: Unified Local AI Pipeline (Ollama)
This approach bypasses external APIs and rate limits entirely by utilizing a local LLM (e.g., `llama3.1` or `qwen2.5`) via Ollama and bash pipelines.
* *Source:* [Ollama](https://ollama.com/)

* **JSON Translation Pipeline:**
  ```bash
  cat messages/en.json | ollama run qwen2.5 "Translate only the string values in this JSON to [TARGET]. Output strictly valid JSON and keep the keys exactly as they are." > messages/[target].json
  ```
* **Markdown Translation Pipeline:**
  ```bash
  cat docs/readme.md | ollama run qwen2.5 "Translate this Markdown to [TARGET]. Do not translate the YAML frontmatter, code blocks, or URL links." > docs/readme_[target].md
  ```

## Tasks
- [ ] Evaluate `@inlang/cli` against current Paraglide setup for JSON dictionaries.
- [ ] Test `md_translate` vs `md-translator` on a sample Markdown document containing code blocks and frontmatter.
- [ ] Test the Ollama bash pipeline locally to evaluate translation quality and speed.
- [ ] Select the optimal tooling path (Format-specific vs. Unified AI).
- [ ] Write a translation script (e.g., `translate.sh` or a task runner step) to batch-process both `messages/` and `docs/` directories.
- [ ] Update `README.md` or `CONTRIBUTING.md` with instructions on how to trigger the translation CLI.

## Additional Notes
Standard machine translation (like plain curl requests to basic endpoints) will destroy Markdown formatting and Inlang interpolation variables. Any selected tool must be explicitly format-aware or properly prompted if using the LLM route.

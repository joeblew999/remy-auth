# Translations through upstream tools, the same in every app

Status: analysed 2026-09-26; recommendation below. Folds in
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

## Analysis (2026-09-26)

Three surveys ran on 2026-09-26: UI catalogs, Markdown docs and the translation engine. They used
primary sources (npm registry, GitHub, vendor docs) and CLI runs in scratch directories outside the repo.
Nothing was installed into the repo. Versions and dates are as of that day. A point marked **assumed**
was not verified.

### Measured corpus

- **Docs:** the 8 files in `src/docs/table.js` hold 15,449 words (112k characters, about 4.2k of them
  in code blocks). The earlier "~22k words" estimate was too high.
- **UI catalog:** `messages/en.json` has 191 keys and about 944 words. 8 strings have `{placeholders}`
  and 12 are inlang variant objects (`declarations`, `selectors`, `match`). The declarations are code, so
  any tool that translates every JSON string would break them.
- **Churn:** in the last 30 days, 166 commits touched these files (+2,895/−874 lines). That is about 1.7
  times the corpus a month, so translating in batches on main costs less than translating each commit.

### 1. UI catalogs: does inlang now translate and check?

**(a) Machine translation: yes. (b) Completeness check: no.** The earlier note that 3.3.8 "has only
lint and validate" was wrong.

- **`@inlang/cli` 3.3.8** was published 2026-09-25 (opral/inlang, 7 open issues). Its commands are
  `validate`, `machine translate`, `plugin build` and `lint`. Sources:
  https://www.npmjs.com/package/@inlang/cli and
  https://inlang.com/m/2qj2w8pu/app-inlang-cli/changelog.
  - `machine translate` fills only missing or empty variants and never overwrites. Placeholders go
    through as `<span class="notranslate">`. In tests, `{name}` and `{count}` survived in es and ar, and
    declarations and selectors were copied unchanged. It runs without prompts and exits 0.
  - The provider is set by `INLANG_MACHINE_TRANSLATE_PROVIDER`: `google` (with
    `INLANG_GOOGLE_TRANSLATE_API_KEY`), `deepl`, or by default a free community service with no SLA.
    There is no LLM provider. Source: https://inlang.com/m/2qj2w8pu/app-inlang-cli/byok.
  - **Plurals:** it copies English's `one`/`other` variants into every locale and does not create the
    CLDR categories a locale needs (ar zero/two/few/many). Paraglide's compiled output returns the raw key
    when no variant matches, so a machine-translated new plural would show `apps_count` for some counts.
  - Its first run rewrites each catalog with a `$schema` key and a new key order, so that diff is large.
    It sends PostHog telemetry and Sentry errors; whether they can be turned off is **assumed** not.
  - `lint` is a stub pointing to https://github.com/opral/lix/issues/239, open since 2025-02 with no
    date. `validate` checks settings only: a missing key and a dropped `{name}` still pass with exit 0.
- **The rest of the inlang ecosystem has no check.** `@inlang/sdk` 3.0.6 is a library. Paraglide JS
  2.25.4 compiles only (https://github.com/opral/paraglide-js). The lint-rule packages were last
  published in 2024 for the old SDK. Sherlock and Fink are editors with no CI use
  (https://inlang.com/c/tools). `paraglide-messages-mcp` 0.3.0 has 0 stars; it is an idea to watch
  (https://github.com/whazeted/paraglide-messages-mcp).
- **`@lingual/i18n-check` 0.9.5** is MIT, offline and free (185 stars, pushed 2026-07-10;
  https://github.com/lingualdev/i18n-check). It is the best check available.
  - It reads Paraglide JSON directly with `-f icu` and exits 1 on problems.
  - On a synthetic catalog it caught a missing key, a dropped `{name}`, a renamed `{count}` and a
    missing variant.
  - On our real catalogs its only findings were 45 false positives. All were plural or ordinal
    categories that the language does not use, or ar/he `one` variants that correctly leave out
    `{countText}`.
  - With `-i` on the plural keys the run is clean, but then those keys go unchecked.
  - It has no staleness check and no CLDR-aware plural check.
- **Other candidates:**
  - lingo.dev: partial. It has no inlang format, and its `json` bucket translated `declarations`,
    `selectors` and `{name}` in a `--pseudo` run.
  - json-translator 4.1.0: no. Inactive since 2025-09 and would break declarations
    (https://github.com/mololab/json-translator).
  - i18next-cli: no, i18next format only.
  - Tolgee, Crowdin and Weblate: no. All are hosted with accounts, and none lists inlang's format
    (https://docs.tolgee.io/platform/supported_formats).

### 2. Docs: a maintained Markdown translator with change tracking

**Yes: the `lingo.dev` CLI 0.138.8**, released 2026-09-11, Apache-2.0
(https://github.com/lingodotdev/lingo.dev, 5.4k stars, 34 open issues, pushed 2026-09-25). It runs
in bring-your-own-key mode with no Lingo account. Everything below was tested in a scratch install against
a local stub LLM.

- **Structure:** each Markdown block becomes one segment. Fenced and inline code are replaced by
  placeholders and restored exactly, and tables survive.
- **Protected patterns:** link URLs, Fumadocs `[#id]` heading ids and HTML comments are not protected by
  default. With `lockedPatterns: ["\\[#[a-z0-9-]+\\]", "\\]\\([^)]*\\)", "<!--[\\s\\S]*?-->"]` they
  pass through unchanged.
- **Change tracking:** `i18n.lock` stores an md5 per segment. After one paragraph was edited, only that
  segment went to the LLM. The lockfile replaces our provenance line and `remarkDropProvenance`.
- **Checks:**
  - `lingo.dev run --frozen --pseudo` exits 1 with "Source file has been updated" or "Target file is
    missing translations", and needs no API key.
  - `lingo.dev status` reports missing and updated counts per locale but always exits 0, so it serves as
    the warning.
- **Provider:** set in `i18n.json` as `provider: {id, model, prompt}`. The ids are openai, anthropic,
  google, openrouter, ollama and mistral, with keys read from the environment (source:
  `packages/cli/src/cli/localizer/explicit.ts`).
- **Separate product:** `@lingo.dev/cli` 1.16.0 is Lingo.dev's hosted push/pull tool and needs
  `LINGO_API_KEY`. It is not used here.
- **Bug found:** `provider.baseUrl` is passed as `baseUrl` where the AI SDK expects `baseURL`, so it is
  ignored. `OPENAI_BASE_URL` works around it. This only matters behind a gateway.
- **Target files are overwritten:** a manual edit to a translation is lost on the next run. Fixes go into
  the English, the prompt or a glossary.
- **Other candidates:**
  - General Translation `gtx-cli` 2.22.3: partial. It needs a GT project and API
    (https://generaltranslation.com/en/docs/cli/reference/config).
  - Crowdin CLI 5.3.0: partial. Its memory, machine translation and `status --fail-if-incomplete` live on
    the hosted platform (https://crowdin.github.io/crowdin-cli/commands/crowdin-status).
  - Intlayer `doc translate` 9.5.10: partial. It tracks changes only by git diff or file time and has no
    staleness check (https://intlayer.org/doc/concept/cli/doc-translate).
  - po4a 0.74, Translate Toolkit 3.20.0 and mdpo 2.1.4: partial. They give real PO translation memory
    but no machine translation, and the PO files become the layout (https://github.com/mquinson/po4a,
    https://pypi.org/project/translate-toolkit/, https://github.com/mondeja/mdpo).
  - Issue #4's picks: md_translate 3.4.0 is archived with its last release on 2024-10-29
    (https://github.com/ilyachch/md_docs-trans-app). md-translator is 1.0.0 from 2019 and its repo
    returns 404 (https://registry.npmjs.org/md-translator). Both: no.
- **Fumadocs** is not a translator. Its i18n docs cover routing and the `dot`/`dir` parsers only, and say
  "Fumadocs is not a full-powered i18n library" (https://github.com/fuma-nama/fumadocs). We already use
  `parser: 'dir'`, so the translation tool decides the layout.

### 3. Who translates

**An LLM through a hosted API, called by the pinned tool in the one-writer step.** The engine is
Claude Sonnet 5, set as lingo.dev's `anthropic` provider.

- **Cost:** a full docs run into 12 locales is about 0.65M input and 0.72M output tokens, so about $8.5,
  or $4.3 at batch price. That uses the pricing at
  https://platform.claude.com/docs/en/about-claude/pricing and **assumes** output is 1.5 times the
  English. An incremental change costs cents.
- **Quality:** Anthropic's benchmarks put ar, ja, hi, zh, es and de at 96–98% of English
  (https://platform.claude.com/docs/en/build-with-claude/multilingual-support). Quality in am, fa, he, th,
  pl and tr is **assumed**, not measured. Opus 5.5 at about twice the cost is the upgrade for am, fa and
  th if a reader finds them weak.
- **Machine-translation engines alone fail the constraints:**
  - DeepL has no Amharic (https://developers.deepl.com/docs/getting-started/supported-languages).
  - LibreTranslate/Argos has no Amharic.
  - Google NMT covers all 12 languages (https://docs.cloud.google.com/translate/docs/languages), but its
    API takes only HTML or plain text, so Markdown needs a round trip.
  - Workers AI m2m100 works sentence by sentence and has no zh-TW (**assumed**).
- **Issue #4's Ollama picks fail:**
  - `llama3.1` officially supports 8 languages, and ar, fa, he, ja, zh, am, pl and tr are not among them
    (https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/MODEL_CARD.md).
  - `qwen2.5` does not claim Amharic.
  - `translategemma` 12B is the only credible free local model, but it has no evaluated Amharic and
    would take about 8–13 h on this M2 Pro with 16 GB (**assumed**).
  - Local output also differs from machine to machine, which works against "identical in every app".
- **UI catalogs use Google NMT** through `inlang machine translate`. It is the only inlang provider
  that covers am. The catalogs total about 150k characters per full run, inside the 500k characters a month
  that are free (https://cloud.google.com/translate/pricing).
- **An agent (`claude -p`) is not the engine.** It stays only for the one job no tool does: adding a
  locale's plural categories to a new plural message.

### 4. Layout

lingo.dev needs one path pattern containing `[locale]`, with English as the `en` case (source:
`packages/cli/src/cli/utils/buckets.ts`). The layout is therefore:

- **Translations:** `docs/i18n/[locale]/<repo path>`, the same place they are today.
- **English:** `docs/i18n/en/<repo path>` holds relative **symlinks** to the real files (`README.md`
  and the others stay where GitHub and readers expect them).
  - Tested: lingo.dev follows the symlinks and writes translations as real files.
  - Symlinks on Windows checkouts are **assumed** fine. Fumadocs reads the files the docs table lists,
    not a directory scan, so it is not affected.
- **Config at the app root:** `i18n.json`, with the locales, the bucket pattern, `lockedPatterns` and
  the provider, and `i18n.lock`, committed and written only by the translate step.
- **Catalogs:** `packages/ui/messages/<locale>.json` and `project.inlang` do not change.

The locale list must come from one source, `project.inlang/settings.json`. `i18n.json`'s `locale.targets`
is generated from it by a `jq` one-liner in the translate task. `project:layout` checks that the symlinks
and `i18n.json` exist when the docs table has rows.

The rejected alternative is `file.[locale].md` siblings. They would force a `README.en.md` and break
GitHub's README convention.

### 5. Docs for AI answers without `docs-publish.mjs`

**Not yet.**

- **Website data source:** AI Search can crawl the site itself through the sitemap, including
  `<lastmod>` change detection, which would replace the R2 bucket and `docs-publish.mjs`. However, "both
  parse types require a source URL on a domain that you have onboarded onto the same Cloudflare account"
  (https://developers.cloudflare.com/ai-search/configuration/data-source/website/parse-types/). The site
  is on `workers.dev` today.
- **Built-in storage** indexes uploads immediately, but only through the Items API
  (https://developers.cloudflare.com/ai-search/configuration/data-source/built-in-storage/). That is still
  our code.
- **Therefore:** `docs-publish.mjs` stays until there is a domain. Then the AI Search website source
  replaces it and the bucket, and it is deleted. `rclone sync` to R2, which is in the mise registry as
  `aqua:rclone/rclone`, could replace the listing and deleting part. That only works if the object keys
  become the file paths rather than slugs, which is **assumed** acceptable to the answer code. It is not
  recommended now, because the website source removes the whole step soon after.

### 6. Concurrency

The single writer is kept, and the tools make it simpler.

- **Writers:** only `i18n:translate` writes `docs/i18n/<locale>/`, `messages/<locale>.json` and
  `i18n.lock`. It runs on `main` after merges and refuses to run on any other branch (a one-line `git
  branch --show-current` guard).
- **Readers:** feature agents run only `i18n:status` and `i18n:check`. Both only read (`lingo.dev
  status`, `run --frozen --pseudo`, `i18n-check`), need no API key, and can run in parallel in any number
  of worktrees.
- **mise `depends`:** no check depends on translate, so `depends` cannot start a writer inside a feature
  task.
- **Lockfile conflicts:** `i18n.lock` is one file with one writer, so it cannot conflict across branches.
  A branch that edits English leaves its segments "updated" until the next translate run on main, which is
  the intended warning.

### 7. What stays ours, and where it goes

- **Config and conventions, not code:** `i18n.json`, the i18n-check ignore list of plural keys, the
  symlinks, and a rule in how-we-work: **changing an English UI string's meaning means a new key**. A new
  key is missing in every locale, so i18n-check and `inlang machine translate` handle it. This covers the
  staleness no catalog tool detects.
- **Plural categories:** no tool checks that each locale has the CLDR categories it needs. Rather than
  write a checker, we file upstream requests with i18n-check (CLDR-aware plural check) and lix #239. Until
  one lands, adding a plural message is an agent step in the one-writer run, reviewed by a person. If a
  checker is ever needed, it goes into the [remy CLI](parked/remy-cli.md), not a loose script.
- **`docs-publish.mjs`:** stays until there is a domain (question 5).
- **`docs-questions.mjs`:** not translation work, and out of scope here.
- **Nothing else remains as code.**

### Comparison against the constraints

| Candidate | Job | Every app via mise | One writer | Formats kept | Checks by tool | 13 languages incl. RTL, CJK, am | Cost | Maintenance | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `lingo.dev` 0.138.8, BYOK | docs translate, track, check | `npm:lingo.dev` pinned | lockfile, one writer | code yes; ids, links and comments via `lockedPatterns` (tested) | `run --frozen --pseudo` (exit 1), `status` (warning) | engine-dependent; Sonnet 5 covers all 13 (am, fa, th **assumed**) | CLI free; about $4–9 per full run | active, released 2026-09-11 | **fits, with conditions** (layout, `lockedPatterns`, baseUrl bug) |
| `lingo.dev` on catalogs | UI | yes | yes | **no**: translated declarations, selectors and `{name}` | frozen, status | as above | as above | as above | partial (`lockedKeys` protection **assumed**) |
| `@inlang/cli` 3.3.8 `machine translate` | UI translate | `npm:@inlang/cli` pinned | fills only missing | placeholders yes; **plurals copied English-shaped** | no (`validate` checks settings only) | Google provider covers all 12 | Google free tier covers it | active, released 2026-09-25 | **fits** for plain strings |
| `@lingual/i18n-check` 0.9.5 | UI check | `npm:@lingual/i18n-check` pinned | read-only | reads the variant format | missing keys, placeholders, exit 1 | n/a | free, offline | pushed 2026-07-10 | **partial** (ignore list for plurals, no staleness) |
| Claude Sonnet 5 via lingo.dev | engine | key from mise env | n/a | the tool protects the format | n/a | 96–98% on 6 benchmarked languages; others **assumed** | $2/$10 per M tokens | vendor | **fits** |
| Google NMT via inlang | engine for UI | key from mise env | n/a | HTML mode keeps placeholders | n/a | all 12 incl. am | $20 per M chars, 500k a month free | vendor | **fits** for catalogs |
| DeepL (API or `deepl sync`) | engine, catalogs | CLI not on npm | pidfile lock | `validate` checks placeholders | `--frozen` exit 10 | **no am** | 500k free | CLI pushed 2026-09-22 | no |
| Crowdin, Tolgee, GT, Weblate | platform | account | platform | varies | platform | yes | paid (**assumed**) | active | no (hosted, off-repo) |
| Intlayer, po4a, Translate Toolkit, mdpo | docs | yes | yes | partly verified | PO counts only | needs a second engine | free | active or slow | partial |
| md_translate, md-translator, json-translator, Ollama llama3.1/qwen2.5 | issue #4 | — | — | no | none | no | free | archived, gone or inactive | **no** |

### Recommendation

| Job | Tool | mise task (shared, one line) |
| --- | --- | --- |
| UI translation | `@inlang/cli` 3.3.8, `machine translate`, provider `google` | `i18n:translate` (on main only) |
| UI completeness check | `@lingual/i18n-check` 0.9.5, `-f icu -s en -l messages`, plural keys in the ignore list | `i18n:check` |
| Docs translation with change tracking | `lingo.dev` 0.138.8, `run -y` with `i18n.json`, `i18n.lock` and `lockedPatterns` | `i18n:translate` (same step) |
| Docs staleness check | `lingo.dev status` (warning) and `lingo.dev run --frozen --pseudo -y` (error) | `i18n:status` / `i18n:check` |
| Engine | Claude Sonnet 5 through lingo.dev's `anthropic` provider for docs; Google NMT for catalogs | keys from mise env or secrets, needed only by the writer |

- **Tools** are pinned in `[tools]` as `npm:lingo.dev`, `npm:@inlang/cli` and `npm:@lingual/i18n-check`,
  and the tasks live in the shared `tasks/`, so every app runs the same thing.
- **An app with nothing to translate passes:** each task exits 0 when there is no `i18n.json` or no
  `project.inlang`.
- **Warning and error:** `project:check` runs `i18n:status` and i18n-check as a warning. `ui:release`
  runs `i18n:check`, which fails the release.
- **Layout:** as in question 4. `docs/i18n/[locale]/<repo path>` holds the translations, `docs/i18n/en/`
  holds English symlinks, `i18n.json` and `i18n.lock` sit at the root, and the catalogs do not change. The
  layout goes into `project:layout`.

**What this deletes:**

- `tasks/i18n/i18n.mjs` (244 lines) and the bash wrappers `tasks/i18n/check`, `status` and `translate`
  (18 lines). They become one-line TOML tasks.
- The `<!-- translated-from: … -->` provenance line in the 13 translated files under `docs/i18n/es/`.
- `remarkDropProvenance` and its entry in `remarkPlugins` in `source.config.ts` (about 12 lines).
- `I18N_DOCS_TABLE` in `mise.toml`, since the tools read `i18n.json` instead.
- The `--mark` step, and the text describing it in docs/how-we-work.md ("Translations: one writer") and
  `tasks/README.md`.

That is about 280 of the ~350 lines. The rest is `docs-publish.mjs`, which goes once there is a domain.

**What stays ours:** `i18n.json` (config), the ignore list, the English symlinks, the rule that a
changed meaning means a new key, a human or agent step for plural categories, and `docs-publish.mjs` until
a domain exists. There is no custom checker.

**Costs:**

- Docs: about $4–9 for the first full run into 12 locales, then cents per batch.
- Catalogs: inside Google's free tier.
- Checks: free and offline.
- The first lingo.dev run over the existing Spanish docs will likely retranslate them, because there is
  no lockfile yet (**assumed**). That is about $0.7.

**Risks:**

1. **Plurals:** no tool checks per-locale plural categories. inlang copies English-shaped variants, and a
   missing category shows the raw key. This is mitigated by the ignore list plus an agent-and-review step,
   and by the upstream requests.
2. **Quality in am, fa, th, pl, tr and he** is not measured. It needs a native reader's spot check; Opus
   5.5 is the fallback.
3. **lingo.dev overwrites manual fixes** in translations. Fixes go through the English, the prompt or a
   glossary.
4. **lingo.dev lock-in** is moderate: the files stay plain Markdown and only `i18n.lock` is its own. The
   project is a VC-backed company whose hosted product is separate. The BYOK path is **assumed** to stay
   supported.
5. **The `baseUrl` bug**: file it upstream. It does not affect direct Anthropic keys.
6. **Symlinks** on Windows and in some tools are **assumed** fine.
7. **Telemetry:** inlang sends PostHog and Sentry data, and lingo.dev telemetry is **assumed** present.
   Where each allows, turn it off through mise env.
8. **The first inlang run** reorders the catalogs and adds `$schema`, a one-time noisy diff. Land it as
   its own commit.
9. **UI staleness** rests on the new-key rule, not a tool. An English edit that keeps its key and changes
   its meaning goes unnoticed.

## Plan of work

1. **Prove on Spanish docs:**
   - Pin `npm:lingo.dev` 0.138.8.
   - Create `docs/i18n/en/` symlinks and write `i18n.json` with `lockedPatterns` and the `anthropic`
     provider (Claude Sonnet 5).
   - Run it over `docs/i18n/es/`.
   - Check that code blocks, links, `[#id]` headings and comments survive byte for byte.
   - Check that `run --frozen --pseudo` fails after an English edit and passes after translate.
   - Record the cost of the run.
2. **Prove on the 12 catalogs:**
   - Pin `npm:@inlang/cli` 3.3.8 and run `machine translate` with the `google` provider on a branch.
     Land the one-time reordering as its own commit.
   - Pin `npm:@lingual/i18n-check` 0.9.5 and record the plural keys it must ignore.
   - Check that the 12 plural and ordinal messages still compile and render in ar, he, ja and pl.
3. **Replace:**
   - Delete `tasks/i18n/i18n.mjs`, its three wrappers, the provenance lines, `remarkDropProvenance` and
     `I18N_DOCS_TABLE`.
   - Make `i18n:translate` (on main only), `i18n:status` and `i18n:check` one-line tasks over the tools,
     with keys from mise env or secrets and a `jq` line that fills `i18n.json`'s locales from
     `project.inlang`.
   - Rewrite how-we-work "Translations: one writer", including the new-key rule, and `tasks/README.md`.
4. **Translate the rest:** run `i18n:translate` for the other 11 locales. A native reader spot-checks am,
   fa, th and he, and Opus 5.5 is used where a language is weak.
5. **Share:**
   - Put the tools and tasks in the shared `tasks/` and the layout (English symlinks, `i18n.json`,
     `i18n.lock`) in `project:layout`.
   - Prove it in remy-auth-app, including an app with nothing to translate passing.
6. **Upstream:** file i18n-check (CLDR-aware plural categories), lingo.dev (`baseUrl` to `baseURL`) and a
   vote on lix #239.
7. **Later, once there is a domain:** point AI Search at the site's sitemap (website data source) and
   delete `docs-publish.mjs` and the R2 bucket.

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

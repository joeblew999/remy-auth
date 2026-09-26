# Translations through upstream tools, the same in every app

Status: open, 2026-09-26. The analysis is not done yet; it goes in this file. Folds in
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

## Plan of work (after the analysis)

1. Survey against the criteria above; record the choice with evidence here.
2. Prove it on Spanish docs and all 12 catalogs.
3. Replace: delete `i18n.mjs`, the wrappers, the provenance lines and their remark plugin, and whatever
   of `docs-publish.mjs` the tool makes unnecessary; tasks become one-liners over the tool.
4. Put it in the shared tasks and the layout contract; prove it in remy-auth-app.

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

# Automated translation pipeline for Markdown and Paraglide JSON

Status: open, 2026-09-26; from [issue #4](https://github.com/joeblew999/remy-auth/issues/4) (closed into this
plan). Analysis not done yet: to do later, in this file. Owner, on the issue: "This needs to go in as a plan
and looked at carefully. It must work for all consumers and so be mise and tooled in. This was done by
Gemini so it's likely to be a little wrong in some ways and out of date."

## What exists already (2026-09-26)

- Shared `i18n:*` tasks ([tasks README](../tasks/README.md#translations)): `i18n:status`, `i18n:check`
  (warning while pumping, error at release), `i18n:translate` (prints exactly what to translate: the
  English diff for stale docs, missing catalog keys) and `--mark` (provenance line with the English blob).
- The one-writer rule ([how we work](../docs/how-we-work.md#translations-one-writer)): feature agents write
  English; translation is one serialized step on main after merges. Today that step is an agent reading
  `i18n:translate`'s output. This plan is about the tool that does the translating in that step.
- Layout: translations at `docs/i18n/<locale>/<path>`, catalogs at `messages/<locale>.json` (Paraglide,
  `project.inlang`), 13 languages.

## To verify first (the proposal may be out of date)

- `@inlang/cli` 3.3.8 was found to offer only `lint` and `validate` (2026-09-26); whether `machine translate`
  still exists, and on which version, is unverified.
- The other tools named (json-translator, md_translate, md-translator, Ollama) have not been checked.

## Criteria for the analysis

Works for every app on the package through shared mise tasks and a pinned tool (no global installs);
preserves Markdown structure (code blocks, links, heading ids with `[#id]`, the provenance line) and
Paraglide placeholders and plural variants; fits the one-writer step and `i18n:translate --mark`; cost and
quality per language (13, including RTL and CJK); runs offline or on a free/owned endpoint; reviewable diffs.

### The proposal as filed

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

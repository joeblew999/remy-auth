# How apps on the package get the docs and rules

Status: open, 2026-09-26; research not started. Owner: "how are the other consumers going to get the docs?
There are many different ways they can. I was always wondering if our stack can support llms etc or if it
should be a skill from the docs? It's a whole research area in itself?"

## Today

remy-auth-app's `AGENTS.md` links to remy-auth's docs on GitHub `main`
(`https://github.com/joeblew999/remy-auth/blob/main/docs/how-we-work.md`, development, tooling). Two
faults: **unpinned** (the app runs remy-ui 0.11.0 and tasks `ref=v0.11.0`, but its agents read today's
`main`, so the rules can run ahead of its code) and **web-only** (an agent must fetch the pages; nothing
checks it did).

## Options (not exclusive)

| Way | How | Strength | Open questions |
| --- | --- | --- | --- |
| Agent skill | remy-auth publishes a `remy` skill made from its docs; apps pin it in `skills.toml` like the Cloudflare, shadcn and TanStack skills; `skills:install` puts it in every agent | existing mechanism, pinned by commit, loaded by every agent | generated from the docs or written; size; skills format for Codex and Claude |
| In the npm package | the docs ship in `@joeblew999/remy-ui`; `AGENTS.md` points at `node_modules/@joeblew999/remy-ui/docs` | versioned with the package the app uses; offline | which docs (rules vs remy-auth's own); package size |
| `llms.txt` | Fumadocs generates `llms.txt` / `llms-full.txt` from the docs site | any LLM or tool reads them from the web | unpinned like today; which pages |
| MCP server | search and ask the docs as tools, over the AI Search we already run | agents query instead of reading everything | hosting, auth, cost; one more thing to run |
| GitHub links (today) | a URL per doc | simplest | unpinned, web-only |

## Questions for the research

Owner: "Are you asking the right questions?" The first framing (which channel carries the docs) was too
narrow. In order:

1. **Should it be docs at all?** For every rule: can a tool enforce it (the layout contract, `plans:check`,
   `i18n:check`, the test tiers)? Rules that can be checked become checks and stop needing to travel;
   only what cannot be checked stays prose.
2. **Can the tools describe themselves?** Task help is `mise tasks ls` and usage specs (they travel with
   the include and are always current); package reference comes from typed exports. Prose that repeats
   them is drift.
3. **Who reads, for what?** Agents working in an app, developers building one, people evaluating the
   project, outside LLMs answering about it. Each channel is judged by whom it serves.
4. **One home per fact:** one source, every channel (skill, package, llms.txt, site) generated from it by a
   tool through a shared mise task, never copied.
5. **Composition:** an app has its own rules and plans on top of the shared ones; what overrides what,
   and how an agent sees both.
6. **Pinning:** what an app's agents read matches the version it runs (skill pinned by commit, docs in
   the package, or both).
7. **Changes travelling:** when a shared rule changes in a release, how an app learns it on upgrade
   (`project:upgrade-ui` pointing at the changed rules, the changelog).
8. **Proof it worked:** how we know an agent in an app followed the rules (checks that fail, evals), not
   hope that it read them.
9. **Languages:** whether the translated docs travel, or English only for agents
   ([translations](translation-pipeline.md)).
10. **What each agent loads reliably, and when:** skills, `AGENTS.md` links, local files (Claude Code, Codex).

Early lean, to test not assume (after questions 1 and 2 have shrunk what must travel): a skill for how agents work plus the docs in the package for the
version-matched reference, and `llms.txt` because Fumadocs makes it cheap.

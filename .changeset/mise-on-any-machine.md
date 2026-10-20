---
'@joeblew999/remy-ui': minor
'@joeblew999/remy-cli': minor
'@joeblew999/create': minor
---

Every app sets up any machine with mise: a Mac, Linux, Windows or Claude's cloud. The blank app's
`.claude/settings.json` hook runs at the start of every Claude session: it installs mise when the machine has none
(on Windows with winget), then `mise trust` and `mise install`, which bring the Node of `.node-version`, the pnpm of
`devEngines` and the dependencies, and it puts the app's own `vp` on the session's PATH. The blank app has the
`mise.toml` this needs, and its Chrome DevTools MCP server starts with `pnpm dlx` (`vpx` exists only with a global
`vp`).

`remy upgrade` now brings the blank app's agent setup (`.claude/settings.json`, `mise.toml`, `.mcp.json`,
`.codex/config.toml`) into an app; an app's own differing copy is kept as `<file>.before-upgrade`.

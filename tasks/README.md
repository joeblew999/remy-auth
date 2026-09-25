# Shared mise tasks

One file per task namespace (`skills`, `mcp`, `browser`, `web`, `codex`, `claude`, `project`,
`cf`); `mcp/register` is a file task in its namespace directory. remy-auth includes this
directory locally; any other project includes it by git reference pinned to a commit:

```toml
[task_config]
includes = ["git::https://github.com/joeblew999/remy-auth.git//tasks?ref=<commit>"]

[env]
PREVIEW_PORT = "4174"                                   # local host port for preview and tests
PUBLIC_ORIGIN = "http://127.0.0.1:4174"                 # origin in prerendered links for local tests
DEPLOY_ORIGIN = "https://your-app.your-subdomain.workers.dev"   # origin used by cf:deploy
```

The including project supplies the npm packages the tasks run: `vite` with `@tanstack/react-start`,
`wrangler`, `@playwright/test`, `chrome-devtools-mcp`, `modern-web-guidance`, `smol-toml`
(and `@openai/codex` for the Codex tasks). A task defined in the project's own `mise.toml`
overrides the included task of the same name; remy-auth overrides `project:typecheck` and
`project:verify` because it owns the shared package. mise caches remote includes;
`MISE_TASK_REMOTE_NO_CACHE=true` refreshes them.

Tests run in two levels: `project:test` is ours (the app's own browser and HTTP checks,
fast, part of `project:verify`); `project:test:google` is Google's Lighthouse audits and
Core Web Vitals (slow; CI runs it). `project:test:remote` runs both against a deployment. Set `[settings] task.timings = true` in the including
`mise.toml` so each level prints per-task and total durations.

# Docs site and AI answers: swing back and review

Status: problems only, no analysis, 2026-09-25. The docs (`/docs`) and AI answers (`/app/ask`)
went live on remy-auth to have something up; this lists what needs revisiting.

Owner, verbatim: "Later we will need to review the docs design I suspect. This is a new way of
doing things and I suspect it might need revisiting in terms of the design, operations,
efficiency." "You fucked up a ton of things to get this as far as you did." "Right now I just want
it up so at least we have something!" Also: "Agree about reciting docs later" (reindexing), "We
will need to clean up previews too after they run. So make sure mise has the ability to delete
previews?", "commit based preview will allow agents to deploy and test if they need", and on
translation: "The docs translation. Is this also paraglide based or what?"

## What went wrong on the way

1. The docs agent built on a base from before the 13 languages; the merge conflicted, and the ten
   new languages had none of the 17 docs and answer messages. They were machine-translated at
   merge time and need a native-speaker review.
2. Checks that loop every language times every page in one test timed out as languages and docs
   pages grew (CSP, narrow screen, site pages). Each was split per language during the release;
   `build-boundaries` ("the browser never downloads server-only code or devtools") still times
   out on the preview. So 0.10.6 is **not released**: remy-auth is deployed from main, and
   remy-auth-app is still on 0.10.5.
3. The preview alias (`release`) kept serving the previous build to some requests after the wait
   check passed, causing false failures in two releases. Fixed with one alias per commit
   (`release-<sha>`). Previews now pile up: there is no task to delete them. Cloudflare's newer
   Previews (`wrangler preview`, `wrangler preview delete`) replace aliased version URLs.
4. The index upload (`docs:index`) was blocked for the agent; the first run by hand failed part way,
   the second uploaded 62 sections. Cause unknown. Reindexing is manual, not part of deploy.
5. Previews and production share one AI Search index; locally the answers are switched off, so the
   real answer is only checked against a deployed site.
6. The $10 AI Gateway limit may not apply to Workers AI billed postpaid (unverified; money).
7. The build-boundary check flagged `request.cf` written in the docs text, because docs ship to
   the browser as JavaScript; the docs were reworded instead of deciding the check's marker.
8. Adding shadcn's `table` rewrote `"use client"` in `field`, `sheet` and `sidebar`.
9. The docs engine lives in remy-auth's app code, so consumers get no docs or answers
   ([publisher-consumer.md](publisher-consumer.md)).
10. Translation: only the page chrome (navigation, answer page) is Paraglide. The docs themselves
    are the repo's English Markdown, served under every language's URL with canonical to `/en`.
11. Observability is thin: only failures are logged (`ask_failed`), with the error's name alone
    ("Error"), so a failure cannot be diagnosed. Nothing records answered, no-answer, rate-limited
    or too-long, the AI call's time, cache hits or citations; no alert on failures; AI Gateway's own
    logs and spend are not surfaced anywhere we look. Checked 2026-09-25: see
    [observability.md](observability.md#ai-answers-docs-site-what-cloudflare-gives-what-we-have-checked-2026-09-25)
    (spend limit likely not enforced on postpaid, gateway rate limit against Cloudflare's advice,
    questions stored in gateway logs).
12. Going back to an answer page runs the question again: the page is a GET form (`?q=`), its loader
    runs on every visit and the page is `no-store`. AI Search's own cache makes a repeat cost $0
    (gateway logs show `cached: true`, cost 0), but it is still a call. Owner, 2026-09-25: "when you
    click and link to an answer and then go back it seems to run the same search? So blows money?"
13. The docs pages ship as JavaScript and hydrate. Owner, 2026-09-25: "a bit pissed off that this
    thing loads all the docs gui as JavaScript ... so that site has no js or very little ... at the
    moment it's slow in the browser." Server-render the docs content only (no client copy), keep
    the shell's small scripts.
14. Indexing production took 7 minutes (2026-09-25): every section is deleted and re-uploaded one by
    one, and Cloudflare answers "overloaded" while it indexes. Research (docs-ai-tooling-research.md):
    hash each section into its key and skip unchanged ones; upload before delete.
15. Code blocks are left out of the indexed sections (the manifest uses Fumadocs' structured text,
    which has no code), so a section that is mostly commands reads as prose about nothing: the
    answer to "which task streams Worker logs" said the docs do not cover it. Include code blocks.
16. The gateway's 60-a-minute rate limit is still set: removing it through the API was refused by
    the agent's permission check (it changes a shared resource). Owner: dashboard, AI > AI Gateway >
    remy-docs > Settings > Rate limiting off, or `mise run cf:ai-gateway -- rate-limit off` once
    `CLOUDFLARE_AI_EDIT_TOKEN` is set.
17. Preview URLs were on: 14 aliases and 55 versions public, recent ones able to spend on AI answers
    and outside the ASK_PAUSED stop. Turned off in wrangler.jsonc (2026-09-25). cf:preview (release
    gate's Core Web Vitals step) is broken until it moves to `wrangler preview` / `wrangler preview delete`.
18. Level 1 is now 2.1 minutes locally and 2.6 on a preview (280 checks).

## To review later

Docs design (look, navigation, English-only content under 13 languages), operations (indexing,
previews, cleanup, cost limit), efficiency (gate time, docs shipped as JavaScript), and how
consumers get all of it.

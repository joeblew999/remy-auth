<!-- .plans/cedar.md -->

# Cedar: policies over the relation engine, for every Remy app

Status: proposed 2026-10-10, from the research in [cedar-research.md](cedar-research.md). Not started.
Owner: remy-auth. The owner delegated the design ("The plan should be for what you think is best", 2026-10-10);
the decisions are recorded under [Decisions](#decisions-delegated-2026-10-10) with their reasons, and the three
things only the owner can settle are under [For the owner](#for-the-owner).
Executor/Reviewer roles as in [plans and roles](../docs/content/dev/development.md#plans-and-roles).
Each slice lands through [the flow](../docs/content/dev/how-we-work.md#the-flow-three-commands-and-a-guard-that-refuses-the-rest).

## Why

The owner's intent (2026-10-10): remy-auth is "everything running so that any other system can use it".
The research compared four ways to get sign-in and real permissions: Better Auth alone, Better Auth with
Cedar in the Worker, Rauthy unchanged with Cedar in the Worker, and Cedar built into Rauthy. Its verdict
for a central platform was "Cedar built into the identity server", the one option that does not exist.

remy-auth is already that shape. It owns identities and sessions (Better Auth on its own D1), every app
gets the guard and the relation engine from the package, and `<Allowed>` renders what the server allows
([sign-in and permissions](../docs/content/dev/auth.md)). What the research found missing from that
shape, remy-auth is also missing:

| The research's point | remy-auth today | Gap |
| --- | --- | --- |
| Structural relations derived from the app's own tables (Cedar's "attribute" case) | The relation engine: `via: 'table'`, parent, role, everyone; one query per relation | None. This is the part that works, proven on remy-sport's 27 relations |
| Shares that exist only for access | `note_share` rows, read by the engine as `NOTE_EDITOR` / `NOTE_READER`; a relation can be held only between dates (`activeFromColumn`, `activeToColumn`) | Works as an app table, expiry included. Only the write half is missing from the package (`grant`, `revoke`: [slice 2 left it](auth-service.md#not-built-or-assumed)), and that is not Cedar's job |
| Deny rules that always win, with a reason | None. `grants` only add; a relation can grant, never refuse | A locked note, a person excluded from a note shared with their group, "never outside your organisation": each is app code today, or impossible |
| Rules that know how the user signed in | None. The guard knows the session exists | "Deleting needs a sign-in in the last 15 minutes" cannot be written |
| A policy language with tests and proofs, readable by any system | The vocabulary is TypeScript data; its checks are TypeScript | A Rust or Go system cannot run the same rules. Nothing proves what a rule change does |
| "Allowed actions" per row, so the GUI never decides | `canFor` and `<Allowed>` | None. This is what fixed remy-sport's unused ReBAC |
| Other Workers learn who is signed in | Not built; the app-trust slice is next in [auth-service](auth-service.md#next-slices) | Independent of Cedar; Cedar's login facts ride on whatever it chooses |

So the honest scope: Cedar is not a replacement for the engine, and not a central store. It is the
decision layer the engine lacks: given what the engine knows (which relations this person holds on this
thing) plus facts the engine cannot see (time, how they signed in, a deny), a policy decides, and the same
policy file runs in any language.

## The design

**One sentence.** The engine keeps deriving relations from the app's tables; Cedar decides from them.
`grants` become policies, generated at first so nothing changes, then written by hand where an app needs
what `grants` cannot say.

| Piece | Where | What |
| --- | --- | --- |
| Policies, schema, tests | The app's repo: `policies/*.cedar`, `policies/schema.cedarschema`, `policies/*.tests.json` | Versioned with the app's code. The tests are in the Cedar CLI's own format (`name`, `request`, `entities`, `decision`, `reason`, `num_errors`), so the same file runs in `project:check` and from the CLI |
| The engine | `@joeblew999/remy-ui/api/relations`, unchanged | Answers `holds` per relation, as today |
| The entities for one check | Built by the package per request | `principal`: the account, with platform roles as parents (`Remy::User in [Remy::Role]`). `resource`: the object with the relations this person holds on it as a set (`held`, from `heldAmong` per relation, the same one query per relation that `canFor` costs today) and its parent chain (the engine's `via: 'parent'`, as Cedar `parents`). `context.auth`: facts from the session or token |
| The decision | Cedar as WASM (`@cedar-policy/cedar-wasm`), in the app's Worker, behind the same guard | `permit`/`forbid`; `forbid` always wins; a missing fact means deny (`has` guards; deny on any erroring `forbid`) |
| The GUI | `canFor` and `<Allowed>`, unchanged | `canFor` now asks Cedar per row; a denied action may carry the `@reason` of the `forbid` that decided it |

A vocabulary's `grants` compile mechanically:

```cedar
// Generated from grants: { EDIT_NOTE: [{ relation: 'NOTE_AUTHOR' }, { relation: 'NOTE_EDITOR' }] }
@id("notes-edit")
permit(principal, action == Notes::Action::"EDIT_NOTE", resource is Notes::NOTE)
when { resource.held.contains("NOTE_AUTHOR") || resource.held.contains("NOTE_EDITOR") };
```

And what `grants` cannot say becomes a hand-written policy beside it:

```cedar
@id("notes-locked")
@reason("This note is locked")
forbid(principal, action == Notes::Action::"EDIT_NOTE", resource is Notes::NOTE)
when { resource.locked };

@id("notes-delete-fresh")
@reason("Deleting needs a sign-in in the last 15 minutes")
forbid(principal, action == Notes::Action::"DELETE_NOTE", resource)
unless {
  context.auth has signedInAt &&
  context.auth.now < context.auth.signedInAt.offset(duration("15m"))
};
```

What stays as it is, on purpose: relationships local (each app's own D1, [decided 2026-09-25](auth-service.md#runtime-architecture-identity-central-relationships-local-decided-2026-09-25-refined)),
identity central, the guard at the root, `<Allowed>` on the page, the four-places rule for every new
piece ([adding to it](../docs/content/dev/auth.md#adding-to-it)).

## Slices

Each slice is small, lands on its own, and is measured by the consumer fixture: a blank app that only
imports the package gets the piece and its checks pass. The first slice is a spike that can end the plan.

### 0. Spike: Cedar runs in a Worker

Build the notes demo's Worker with `@cedar-policy/cedar-wasm` and answer one check in it. The package's
ESM build imports its `.wasm` as a module (`import * as wasm from "./cedar_wasm_bg.wasm"`), which is
what Wrangler bundles; record whether it does so cleanly, the bundle size against `build-boundaries.checks` and the code-splitting check, cold-start cost, and whether
`isAuthorized` with ten policies and five entities is under a millisecond. The research measured 4.3 MB
(1.4 MB gzipped) and about 32 ms to compile in Node, inside Workers' 64 MiB and 1 s limits; this
confirms it in the real runtime. **If any of these fails, the plan stops here and says why.**

### 1. Cedar decides the notes demo, with nothing changing

`api/cedar` in the package: build entities from the engine's answers, evaluate, map back to `can`.
A generator turns a vocabulary's `grants` into `policies/generated.cedar` and a schema; the notes demo
checks both in. Every existing check passes unchanged (`tests/notes.spec.ts`, `tests/relations.spec.ts`,
`tests/guard.spec.ts`, the types-only file). New checks: Cedar validates the policies against the schema;
the demo's `policies/notes.tests.json` runs in `project:check`; a vocabulary whose generated policies
drift from the checked-in file fails the build.

### 2. What `grants` cannot say

The first hand-written policies in the demo, each with a test, and each something `grants` cannot say
because a relation can only grant: a locked note (`forbid` when `resource.locked`), and one person
excluded from a note shared with their group (a `note_exclusion` row the engine reads as
`NOTE_EXCLUDED`, and `forbid` when `held` contains it, which wins over the share). The `@reason` of
the deciding `forbid` reaches the 403 body and the `can` map. `<Allowed>` gains an optional reason for a denied action, so a page can say why a
control is missing instead of hiding it.

### 3. Facts about the sign-in

`context.auth` from the session remy-auth owns: `now`, `signedInAt`, `method` (today only the emailed
code). One rule in the demo uses it (deleting needs a recent sign-in), and `tests/notes.spec.ts` proves
it with a session older than the limit. When the app-trust slice lands, the same facts come from the
token in another Worker, and the fixture proves it there. MFA and passkey facts wait for Better Auth's
two-factor and passkey plugins, which remy-auth does not run yet; the schema leaves them optional.

### 4. Proofs in CI

`cedar symcc` in GitHub's heavy checks (it needs `cvc5`, which cannot run in a Worker): a guardrail per
app, written as a policy set that must always be implied, such as "nobody edits a locked note". Not in
`project:check`: too slow, and an external binary. If `cvc5` is not installable on the runner, this
slice records that and closes.

### 5. remy-sport, and other systems

remy-sport's 27 relations and 76 actions already run through the engine; its `grants` generate its
policies. Its own move is work in its repository. For a system not in TypeScript, the contract is the
schema, the policies, the entity shapes and the token: it runs Cedar itself (Rust, Java, Go through
`cedar-go`, or WASM) against its own data. This slice writes that contract down in the developer docs.

## Decisions (delegated 2026-10-10)

1. **Cedar sits over the engine; it does not replace it.** The engine's strength is deriving relations
   from tables in one query per relation. Cedar cannot query; it decides from entities. Replacing the
   engine would mean loading rows into entities by hand, which is what the engine already does better.
2. **Relationships stay in each app's D1.** The research's `authz_links` table is the same idea as
   `note_share`: a row that exists only for access. An app keeps writing such rows itself; the package
   does not get a central link store. This keeps the 2026-09-25 decision.
3. **Generated policies first.** Slice 1 changes no behaviour, so every existing check is the proof.
   Hand-written policies come only where `grants` cannot express the rule.
4. **The Cedar CLI's test format, unchanged.** One file runs in `project:check`, from the CLI, and in
   any other language's Cedar.
5. **Fail closed.** Every optional fact is guarded with `has`; any erroring `forbid` is a deny. Cedar
   skips a policy that errors, which would let a broken `forbid` fail open.
6. **Cedar runs in the app's Worker, never in the browser, never as a call to remy-auth per check.**
   The browser asks its backend; the backend decides. This is the research's rule for every option.
7. **Rauthy is not used.** Its cluster needs persistent disks and node-to-node networking, which
   Cloudflare Containers do not offer, and its one advantage over remy-auth here (login facts filled by
   the identity server) remy-auth already has, because it owns the session.
8. **Stable Cedar features only.** Level validation, `datetime` and tags are stable; typed partial
   evaluation is experimental and waits.

## What this is not

- Not a central policy store or decision log. Each app's policies live with its code; its decisions are
  its own events. The research says this is the one real loss against the built-in design, and that it
  only matters at many apps in several languages. Revisit at the second non-TypeScript consumer.
- Not a live change preview. Proofs run in CI (slice 4).
- Not free: 4.3 MB of WASM in every app's Worker (1.4 MB over the wire), confirmed or refuted by the spike.

## Definition of done

Every slice lands in four places or it is not done ([adding to it](../docs/content/dev/auth.md#adding-to-it)):
the package, remy-auth's notes demo, a check that fails when it is skipped, and the sign-in and
permissions page. The plan closes when slice 3 is on main and live, the consumer fixture uses a policy,
and slices 4 and 5 are either done or recorded as left with their reason.

## For the owner

1. **A check endpoint on remy-auth for systems that cannot run Cedar?** The decided architecture says
   relationships local, so remy-auth would need the app's data per call. The research shows how
   (resource, parents and attributes sent with each check). Not in this plan unless asked.
2. **Publish the research on the docs site?** It is in [.plans/cedar-research.md](cedar-research.md), so it
   is not translated and not public. Moving it to `docs/content/dev/` puts ~900 lines into the Spanish
   queue (translation is the Claude subscription on the machine, owner 2026-10-09).
3. **When do passkeys and two-factor come to remy-auth?** Until they do, "facts about the sign-in" are
   the time and the method only.

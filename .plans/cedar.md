<!-- .plans/cedar.md -->

# Cedar in remy-auth: rules any app can write, test and prove

Status: proposed 2026-10-10. Not started. Owner: remy-auth.
Comes from [cedar-research.md](cedar-research.md), the comparison of Better Auth and Rauthy with Cedar.
The owner delegated the design ("The plan should be for what you think is best", 2026-10-10). Decisions are under
[Decisions](#decisions-delegated-2026-10-10); the three things only the owner can settle are under [For the owner](#for-the-owner).
Executor/Reviewer roles as in [plans and roles](../docs/content/dev/development.md#plans-and-roles). Each slice lands
through [the flow](../docs/content/dev/how-we-work.md#the-flow-three-commands-and-a-guard-that-refuses-the-rest).

## In one paragraph

remy-auth already answers "who are you" (Better Auth) and "what do you hold on this thing" (the relation
engine, from the app's own tables). What it cannot do is say **no**: a relation can only grant. It also
cannot look at anything but relations: not the time, not how the person signed in. And its rules are
TypeScript data, so no test file proves them and no other language can run them. Cedar adds exactly
that: a small policy file per app that decides from what the engine found, can refuse with a reason, can
read the clock and the sign-in, has its own test format, and can be proven in CI. Nothing an app has
today changes. Better Auth stays. The engine stays. `<Allowed>` stays.

## The three layers, and what each decides

| Layer | Question it answers | Where it runs | Exists today |
| --- | --- | --- | --- |
| Better Auth | Who is this? When and how did they sign in? | remy-auth's Worker, its own D1 | Yes |
| The relation engine | Which relations does this person hold on this thing? (author, editor, member, parent's admin, platform admin) | The app's Worker, the app's own D1 | Yes |
| Cedar | Given those relations, the time and the sign-in, may they do this action? If not, why? | The app's Worker, as WASM, inside the guard | **This plan** |

The browser never decides. It gets `can` with each row and renders through `<Allowed>`. That is what
fixed remy-sport's unused permissions and it does not change.

## What we want from Cedar, and what each one takes

Every Cedar capability the research named, with the honest answer for remy-auth:

| Wanted | How we get it | Slice |
| --- | --- | --- |
| Per-thing decisions ("can Alice edit note 42") | Already: the engine. Cedar decides from its answer | 1 |
| Inheritance ("admin of the team is admin of its notes") | Already: `via: 'parent'`. Becomes Cedar `parents`, so `resource in Team::"x"` works too | 1 |
| Shares, with an end date | Already: a `note_share` row, held between dates. No Cedar needed; Cedar templates are not used (decision 2) | — |
| **Deny rules that always win, with a reason** | Cedar `forbid` with `@reason`. The reason reaches the 403 body and the `can` map | 2 |
| **Rules about the sign-in** ("delete needs a sign-in in the last 15 minutes") | `context.auth` from the Better Auth session: `now`, `signedInAt`, `method` | 3 |
| Allowed actions per row, so the GUI never decides | Already: `canFor` and `<Allowed>`. Cedar now computes them, and a denied action carries its reason | 2 |
| Listing ("what can I see") | Already: `objectsHeldBy` for "yours", then `canFor` on the page | — |
| **A test file that proves the rules** | Cedar's own `run-tests` format (`name`, `request`, `entities`, `decision`, `reason`, `num_errors`), run in `project:check` | 1 |
| **Proof that a change does what you think** | `cedar symcc` in GitHub's heavy checks: guardrails such as "nobody edits a locked note", proven against every edit | 4 |
| Level validation (the app knows exactly which entities to send) | Validate at level 1: policies may read the resource and its parents, nothing deeper | 1 |
| **Rules any language can run** | The policies, schema and entity shapes are the contract; a Rust or Go system runs Cedar itself | 5 |
| Fail closed | `has` guards on every optional fact; an erroring `forbid` is a deny | 1 |
| Decisions you can audit | Every deny is logged with the policy id that decided it, through the existing observability | 2 |
| Live change preview in an admin screen | **Not this plan.** Proofs run in CI instead | — |
| MFA and passkey facts | **After** Better Auth's two-factor and passkey plugins are in remy-auth. The schema leaves `mfa` and `passkey` optional until then | later |

## What an app does

An app using TanStack and oRPC does five things. The first four it already does today.

1. Installs `@joeblew999/remy-ui` and gets the package: guard, engine, Cedar, `<Allowed>`.
2. Writes its vocabulary as data (object types, relations, actions), as today.
3. Puts `guard()` at its oRPC router's root and declares a policy on every procedure, as today.
4. Renders controls inside `<Allowed>`, as today.
5. **New:** keeps `policies/` beside its code: `generated.cedar` (from its vocabulary's `grants`, by the
   package, checked in), `schema.cedarschema` (generated too), hand-written `*.cedar` for what grants
   cannot say, and `*.tests.json`. `project:check` validates, runs the tests, and fails if the generated
   file drifts from the vocabulary.

An app that uses TanStack server functions without oRPC calls the same `decide()` the guard calls. The
check that nothing outside the router escapes is [an open row of the auth plan](auth-service.md#requirements-for-the-shared-guard-from-remy-sport-2026-10-09),
not this one; Cedar gives it one function to require.

What the generated file looks like, for the notes demo:

```cedar
// Generated from grants: { EDIT_NOTE: [{ relation: 'NOTE_AUTHOR' }, { relation: 'NOTE_EDITOR' }] }
@id("notes-edit")
permit(principal, action == Notes::Action::"EDIT_NOTE", resource is Notes::NOTE)
when { resource.held.contains("NOTE_AUTHOR") || resource.held.contains("NOTE_EDITOR") };
```

And the hand-written file beside it:

```cedar
@id("notes-locked")
@reason("This note is locked")
forbid(principal, action == Notes::Action::"EDIT_NOTE", resource is Notes::NOTE)
when { resource.locked };

@id("notes-excluded")
@reason("The author has removed your access to this note")
forbid(principal, action, resource is Notes::NOTE)
when { resource.held.contains("NOTE_EXCLUDED") };

@id("notes-delete-fresh")
@reason("Deleting needs a sign-in in the last 15 minutes")
forbid(principal, action == Notes::Action::"DELETE_NOTE", resource)
unless {
  context.auth has signedInAt &&
  context.auth.now < context.auth.signedInAt.offset(duration("15m"))
};
```

`held` is the set of relations this person holds on this thing, built from the engine's `heldAmong`,
one query per relation, the same cost `canFor` pays today.

## What remy-auth itself shows

Every piece is used by remy-auth before any app takes it ([the four-places rule](../docs/content/dev/auth.md#adding-to-it)).

| Piece | Shown in remy-auth | Checked by |
| --- | --- | --- |
| Generated policies decide the notes demo, with nothing changing | `/app/notes` behaves as today | Every existing check: `tests/notes.spec.ts`, `tests/relations.spec.ts`, `tests/guard.spec.ts`, the types-only file |
| A deny with a reason | A locked note: Edit is missing and the page says why. An excluded person: the note shared with their group is not theirs | `tests/notes.spec.ts`: the reason in the 403 and in `can`; `offeredActions` still exact |
| A rule about the sign-in | Deleting a note after 15 minutes asks for a fresh sign-in | `tests/notes.spec.ts`, with a session older than the limit |
| The shared GUI | `<Allowed>` with `reason`; the account page shows when and how you signed in (the facts policies read) | The page's `offeredActions` check; `tests/auth.spec.ts` |
| The docs | [Sign-in and permissions](../docs/content/dev/auth.md) gains "Rules: Cedar" with the five steps, and the contract for other languages | `docs:check`; the `remy` skill reads it |
| Any app gets it | The consumer fixture, a blank app that only imports the package, keeps a policy file and its tests | The fixture's `project:check` |
| The deploy | On staging and production, with the stamp | `project:test:live` |

## Slices

Small, in order, each landed on its own. Slice 0 can stop the plan.

**0. Spike: Cedar runs in a Worker.** Answered on 2026-10-10 in a throwaway Worker under Wrangler
4.149 and workerd, outside the repo ([verified below](#verified-2026-10-10-outside-the-repo)). What is
left for the repo: build remy-auth's own Worker with the package the way the spike shows, and confirm
`build-boundaries.checks` and the code-splitting check accept the 4.2 MiB `.wasm`. The plan stops here
only if those two checks refuse it and cannot honestly be made to accept it.

**1. Generated policies, nothing changes.** `api/cedar` in the package: entities from the engine,
`decide()`, `can` from the answer. The generator for `generated.cedar` and the schema. Level-1
validation, the test runner in `project:check`, the drift check. The notes demo checks its files in.
Done when every existing check passes unchanged and the new ones run.

**2. Denies with reasons.** The locked note and the exclusion in the demo, each with a test. The reason in
the 403 body and the `can` map; `<Allowed>` gains `reason`; every deny logged with its policy id.

**3. Facts about the sign-in.** `context.auth` from the Better Auth session. The fresh-sign-in rule in
the demo, proven with an old session. The account page shows the facts. When the app-trust slice of
[auth-service](auth-service.md#next-slices) lands, the same facts come from the token in another
Worker, and the consumer fixture proves it there.

**4. Proofs in CI.** `cedar symcc` in GitHub's heavy checks, with `cvc5`: one guardrail per app, each
written as the region that must never be allowed and proven with `disjoint` (verified below). `cvc5`
is one `curl` of a static Linux binary from its GitHub releases; the CLI is
`cargo install cedar-policy-cli --features analyze`. Cache both on the runner.

**5. Other languages, and remy-sport.** The contract written in the docs: schema, policies, entity
shapes, token. remy-sport's vocabulary generates its policies; its move is work in its own repository.

## Verified 2026-10-10, outside the repo

Run in a scratch directory with `@cedar-policy/cedar-wasm` 4.13.0, Wrangler 4.149.0, `cedar-policy-cli`
4.13.0 and `cvc5` 1.4.2. The files are in [`.plans/cedar/`](cedar/): the schema, the generated and
hand-written policies from this plan, the test file, the guardrail, and the spike Worker. Each is a
starting point for its slice, not a finished piece.

| Claim in this plan | Result | What to do in the repo |
| --- | --- | --- |
| The policies above are valid | Yes: `cedar validate` passes, at level 1 too | Use [`cedar/schema.cedarschema`](cedar/schema.cedarschema), [`generated.cedar`](cedar/generated.cedar), [`rules.cedar`](cedar/rules.cedar) as they are |
| The test file proves them | Yes: 7 of 7 pass in [`cedar/notes.tests.json`](cedar/notes.tests.json), including fail closed (no sign-in time → deny by `notes-delete-fresh`) and the reasons | The request's `principal`, `action` and `resource` are strings, `Notes::User::"alice"`, not objects. Entities and context are JSON; a `datetime` is `{"__extn":{"fn":"datetime","arg":"…Z"}}` |
| Wrangler bundles the WASM | Yes: 4223 KiB upload, 1413 KiB gzipped; `.cedar` files load through a `Text` module rule | Add the rule with `fallthrough: true` so Wrangler's default text rules still apply |
| The package's ESM build runs in workerd | **No.** It fails at load: `__wbindgen_start is not a function`. It expects the bundler to instantiate the WASM; Wrangler hands over a `WebAssembly.Module` | Use the `web` build: `import * as cedar from '@cedar-policy/cedar-wasm/web'`, `import wasm from '@cedar-policy/cedar-wasm/web/cedar_wasm_bg.wasm'`, then `cedar.initSync({ module: wasm })` once at module load ([`cedar/spike-worker.ts`](cedar/spike-worker.ts)) |
| One check costs under a millisecond | **Only with preparsing.** `isAuthorized` re-parses schema and policies every call: 3–5 ms. `preparseSchema` + `preparsePolicySet` once per isolate, then `statefulIsAuthorized`: 0.46–0.77 ms with request validation on | `api/cedar` preparses at module load and uses `statefulIsAuthorized` |
| The deciding policy's `@id` comes back as the reason | **Only if policies are given as a map.** Text policies are named `policy0`, `policy1`… Split the text with `policySetTextToParts`, key each by its `@id`, pass `staticPolicies` as that record | The generator writes the map; `@reason` is read from the same policy text |
| A proof runs in CI | Yes: `cvc5` installs from `https://github.com/cvc5/cvc5/releases/latest/download/cvc5-Linux-x86_64-static.zip` (44 MB); the proof takes under a second; removing the lock rule gives a counterexample naming an admin editing a locked note | A guardrail is the forbidden region as a `permit` ([`cedar/guardrail-locked.cedar`](cedar/guardrail-locked.cedar)), checked with `cedar symcc … disjoint --policies1 <app> --policies2 <guardrail>`. `implies` is the wrong tool for this: it asks whether set 2 allows everything set 1 allows |
| Cold start fits | A first request answered in 166 ms end to end under `wrangler dev`, including the five checks and a 200-check loop | Measure once on the deployed Worker with the stamp; `performance.now()` reads 0 at module load in workerd, so time it from the request |

## Decisions (delegated 2026-10-10)

1. **Cedar decides; the engine still finds.** Cedar cannot query a database. The engine's one query
   per relation is the right way to find what a person holds. Replacing it would mean loading rows by
   hand, which is what it already does better.
2. **No Cedar templates, no central link store.** A share is a row in the app's own D1, read by the
   engine, as today. This keeps [relationships local](auth-service.md#runtime-architecture-identity-central-relationships-local-decided-2026-09-25-refined), decided 2026-09-25.
3. **Generated policies first, so nothing changes.** Hand-written policies only for what `grants`
   cannot say. The existing checks are the proof of slice 1.
4. **Cedar's own test format**, so one file runs in `project:check`, from the CLI, and in any language.
5. **Fail closed.** Cedar skips a policy that errors, which would let a broken `forbid` fail open.
   Every optional fact is guarded with `has`; any erroring `forbid` is a deny.
6. **Cedar runs in the app's Worker.** Never in the browser (the user can change anything there), never
   as a call to remy-auth per check (an app's data is its own).
7. **Better Auth stays as it is.** It is the only source of identity, sessions and the sign-in facts.
8. **Rauthy is not used.** Its cluster needs disks and node-to-node networking that Cloudflare
   Containers do not give, and its one advantage here, sign-in facts from the identity server, remy-auth
   already has, because it owns the session.
9. **Stable Cedar features only.** Level validation, `datetime` and tags are stable. Typed partial
   evaluation is experimental and waits.

## What this is not

- Not a central policy store or one log for every app. Each app's policies live with its code. The
  research says that only matters at many apps in several languages; revisit at the second one.
- Not an admin screen with live preview. Proofs run in CI.
- Not free: 4.2 MiB of WASM in every app's Worker, 1.4 MiB over the wire. Measured; the repo's two
  bundle checks decide whether that is acceptable.

## Definition of done

The plan closes when slices 0 to 3 are on main and live, the consumer fixture keeps a policy file and
its tests pass, the docs page is updated, and slices 4 and 5 are done or recorded as left with the reason.

## For the owner

1. **A check endpoint on remy-auth for systems that cannot run Cedar?** It would need the app's data
   with each call; the research shows how. Not in this plan unless asked.
2. **Publish the research on the docs site?** It is in `.plans/`, so not translated and not public.
   Moving it to `docs/content/dev/` puts about 900 lines into the Spanish queue.
3. **When do passkeys and two-factor come to remy-auth?** Until then, the sign-in facts are the time
   and the method.

import * as cedar from '@cedar-policy/cedar-wasm/web';
import wasmModule from '@cedar-policy/cedar-wasm/web/cedar_wasm_bg.wasm';
import policiesText from './all.cedar';
import schema from './schema.cedarschema';

// Once per isolate: instantiate, split the policy text into one policy per @id, preparse both.
const t0 = performance.now();
cedar.initSync({ module: wasmModule });
const parts = cedar.policySetTextToParts(policiesText);
if (parts.type !== 'success') throw new Error(JSON.stringify(parts.errors));
const byId: Record<string, string> = {};
for (const p of parts.policies) {
  const m = /@id\("([^"]+)"\)/.exec(p);
  byId[m ? m[1] : `policy${Object.keys(byId).length}`] = p;
}
const reasons: Record<string, string> = {};
for (const [id, p] of Object.entries(byId)) { const m = /@reason\("([^"]+)"\)/.exec(p); if (m) reasons[id] = m[1]; }
const s1 = cedar.preparseSchema('notes', schema);
const s2 = cedar.preparsePolicySet('notes', { staticPolicies: byId });
if (s1.type !== 'success' || s2.type !== 'success') throw new Error('preparse failed ' + JSON.stringify([s1, s2]));
const setupMs = performance.now() - t0;

const iso = (minsBefore: number) => new Date(Date.parse('2026-10-10T10:00:00Z') - minsBefore * 60_000).toISOString();

function check(held: string[], locked: boolean, action: string, signedInAgoMin: number | null) {
  const auth: Record<string, unknown> = { now: { __extn: { fn: 'datetime', arg: iso(0) } } };
  if (signedInAgoMin !== null) auth.signedInAt = { __extn: { fn: 'datetime', arg: iso(signedInAgoMin) } };
  const r = cedar.statefulIsAuthorized({
    principal: { type: 'Notes::User', id: 'alice' },
    action: { type: 'Notes::Action', id: action },
    resource: { type: 'Notes::NOTE', id: 'n1' },
    context: { auth },
    preparsedSchemaName: 'notes',
    preparsedPolicySetId: 'notes',
    validateRequest: true,
    entities: [
      { uid: { type: 'Notes::NOTE', id: 'n1' }, attrs: { held, locked }, parents: [] },
      { uid: { type: 'Notes::User', id: 'alice' }, attrs: {}, parents: [] },
    ],
  });
  if (r.type !== 'success') return JSON.stringify(r.errors);
  const ids = r.response.diagnostics.reason;
  const why = ids.map(id => reasons[id]).filter(Boolean);
  return `${r.response.decision} by ${JSON.stringify(ids)}${why.length ? ' — ' + why.join('; ') : ''}${r.response.diagnostics.errors.length ? ' ERRORS ' + JSON.stringify(r.response.diagnostics.errors) : ''}`;
}

export default {
  fetch() {
    const a = check(['NOTE_AUTHOR'], false, 'EDIT_NOTE', null);
    const b = check(['NOTE_AUTHOR'], true, 'EDIT_NOTE', null);
    const c = check(['NOTE_AUTHOR'], false, 'DELETE_NOTE', 5);
    const d = check(['NOTE_AUTHOR'], false, 'DELETE_NOTE', 50);
    const e = check(['NOTE_AUTHOR'], false, 'DELETE_NOTE', null);
    const n = 200; const t2 = performance.now();
    for (let i = 0; i < n; i++) check(['NOTE_AUTHOR', 'NOTE_READER'], false, 'EDIT_NOTE', 5);
    const per = (performance.now() - t2) / n;
    return Response.json({ cedarVersion: cedar.getCedarVersion(), setupMsOncePerIsolate: +setupMs.toFixed(1), msPerCheck: +per.toFixed(3),
      editUnlocked: a, editLocked: b, deleteFresh: c, deleteStale: d, deleteNoSignInTime: e });
  },
};

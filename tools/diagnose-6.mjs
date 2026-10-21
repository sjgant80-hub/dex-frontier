#!/usr/bin/env node
// tools/diagnose-6.mjs — after data/diagnose-5.json: the relay only pays if a department's body can USE the score it is
// sent, and a body of threshold rules cannot (it keeps a coarse step of it: coupon 0.735 → 0.736, forest 0.839 → 0.840).
// Boosted trees on the same views did (data/diagnose-4.json). So: a department may field, besides its four grown rule
// bodies, depth-2 boosted trees grown on its own records (the Living Seed's own mutation-gated baseline kernel, the same
// learner the pooled rival uses), the best on GATE fielded as before. FIT and GATE only, TEST never read (scrambling every
// TEST record leaves this record unchanged, and it says so). A rule body reads at most MAXFEATS columns, so it reads a
// department's own columns first and then the strongest senders' scores that fit, and the record says what it read;
// boosted trees read every column they are given. Arms, each coupled out of fold (4 folds) on GATE: every department
// alone, one score each (organ 2h's kind of mesh, with the wider choice of body), and the relay, strongest first.
// Deterministic:  node tools/diagnose-6.mjs [--check] → data/diagnose-6.json
import { writeFileSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { linear, trees, oofAuc } from '../src/select.mjs';
import { growDeep, scoreDeep } from '../src/deep.mjs';
import { relay, strongestFirst } from '../src/relay.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6, MAXFEATS } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { DEEP_BODIES, SEED } from './measure-2h.mjs';
import { load } from './contest-2h.mjs';

export const FOLDS = 4, KINDS = [...Object.keys(DEEP_BODIES), 'boosted'];
const T = trees(TREES);
/** what a body of this kind reads: a rule body its first MAXFEATS columns (own first), boosted trees all of them */
const readBy = (kind, view) => (kind === 'boosted' || view.features.length <= MAXFEATS ? view : { ...view, features: view.features.slice(0, MAXFEATS) });
export const growKind = (kind, view, rows) => (kind === 'boosted' ? { kind, m: boosted(view, rows) } : { kind, d: growDeep(readBy(kind, view), rows, SEED, DEEP_BODIES[kind]) });
export const scoreKind = (b, view, i) => (b.kind === 'boosted' ? b.m.score(i) : scoreDeep(b.d, readBy(b.kind, view), i));

/** every kind grown on FIT; the best on GATE fielded (a tie fields the earlier) */
function field(ds, view) {
  const gy = ds.gateRows.map((i) => ds.y[i]), bodies = KINDS.map((k) => growKind(k, view, ds.fitRows));
  const gate = bodies.map((b) => round6(auc(ds.gateRows.map((i) => scoreKind(b, view, i)), gy))), k = gate.reduce((best, g, j) => (g > gate[best] ? j : best), 0);
  return { kind: KINDS[k], body: bodies[k], gate: Object.fromEntries(KINDS.map((x, j) => [x, gate[j]])), gateAuc: gate[k], read: readBy(KINDS[k], view).features.length };
}

async function domain(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), arm = (cols) => ({ linear: round6(oofAuc(linear, cols, gy, FOLDS)), trees: round6(oofAuc(T, cols, gy, FOLDS)) });
  const names = Object.keys(ds.silos), alone = Object.fromEntries(names.map((s) => [s, field(ds, silo(ds, s))]));
  const order = strongestFirst(Object.fromEntries(names.map((s) => [s, alone[s].gateAuc]))), own = new Map(names.map((s) => [silo(ds, s).features.join(), alone[s]]));
  const r = relay({ order, viewOf: (s) => silo(ds, s), field: (view) => own.get(view.features.join()) || field(ds, view), grow: (view, rows, f) => growKind(f.kind, view, rows), score: scoreKind,
    fitRows: ds.fitRows, otherRows: ds.gateRows, n: ds.n, folds: FOLDS, max: Number.MAX_SAFE_INTEGER });
  if (!r.ok) throw new Error(r.error);
  const relayed = r.departments.map((d) => ds.gateRows.map((i) => d.col[i]));
  return {
    cases: ds.gateRows.length,
    alone: { departments: names.map((s) => ({ department: s, fielded: alone[s].kind, gate: alone[s].gate, gateAuc: alone[s].gateAuc })), mesh: arm(names.map((s) => ds.gateRows.map((i) => scoreKind(alone[s].body, silo(ds, s), i)))) },
    relay: { order, departments: r.departments.map((d, k) => ({ department: d.name, took: d.took.length, fielded: d.fielded.kind, read: d.fielded.read, gate: d.fielded.gate, relayedGateAuc: round6(auc(relayed[k], gy)) })), mesh: arm(relayed) },
  };
}

export async function measure() {
  const out = { kind: 'dex-frontier.diagnose-6', v: 1, on: 'FIT and GATE only; TEST never read; four grown rule bodies and boosted trees, the best on GATE fielded', folds: FOLDS, trees: TREES, kinds: KINDS, ruleColumns: MAXFEATS };
  for (const d of ['coupon', 'cover']) out[d] = await domain(load(d).ds);
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(load('coupon').ds))) === JSON.stringify(out.coupon);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/diagnose-6.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/diagnose-6.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/diagnose-6.json', import.meta.url), text); console.log('wrote data/diagnose-6.json · ' + sha256Hex(text).slice(0, 16)); }
}

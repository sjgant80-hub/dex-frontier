#!/usr/bin/env node
// tools/diagnose-4.mjs — after organ 2h: on the coupon offers and the forest cells, what holds the mesh back from every
// record pooled? FIT and GATE only, TEST never read (scrambling every TEST record leaves this record unchanged, and it says
// so). In 2h every department joined in both domains and the mesh beat its parts and grew, yet it trailed every record
// pooled by about 0.03 in both, and on the coupon offers it trailed the frontier model. The sealed disclosure named the
// suspicion: whether a driver takes a coupon turns on the coupon crossed with the driver's habits, which sit in different
// departments, and one score each may not carry that. Boosted trees stand in for a body here, so the answer is about
// what one score can carry, not about how well a body grows. Arms, each coupled out of fold (4 folds) on GATE:
//   · pooled — every record in one place (boosted trees grown on FIT)
//   · boosted mesh — one boosted model per department on its own columns, one score each
//   · pairs — two departments' columns merged into one model, the rest one score each: where the cross-department
//     interaction lives
//   · relay — departments grow in turn, each on its own columns AND the scores the earlier ones send (scores only; a
//     score sent for a FIT case comes from a model that never trained on that case, four folds), strongest first or
//     weakest first; the mesh couples every department's relayed score
// Deterministic:  node tools/diagnose-4.mjs [--check] → data/diagnose-4.json
import { writeFileSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { linear, trees, oofAuc } from '../src/select.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { DOMAINS, load } from './contest-2h.mjs';

export const FOLDS = 4;
const T = trees(TREES);

/** a department's columns, with the scores sent to it added as columns of its own */
const withSent = (ds, s, sent) => { const v = silo(ds, s); return { ...v, features: [...v.features, ...Object.keys(sent)], cols: { ...v.cols, ...sent } }; };

/** a score for every FIT and GATE case: a FIT case's from a model that never trained on it (FOLDS folds), a GATE case's
 *  from the model grown on all of FIT; TEST cases are left at 0 and never scored */
export function crossfit(ds, view) {
  const col = new Float64Array(ds.n);
  for (let f = 0; f < FOLDS; f++) {
    const m = boosted(view, ds.fitRows.filter((_, k) => k % FOLDS !== f));
    for (const i of ds.fitRows.filter((_, k) => k % FOLDS === f)) col[i] = m.score(i);
  }
  const m = boosted(view, ds.fitRows);
  for (const i of ds.gateRows) col[i] = m.score(i);
  return col;
}

/** the relay: each department in the order given grows on its own columns and every earlier department's sent score */
export function relay(ds, order) {
  const sent = {}, out = [];
  for (const s of order) { const col = crossfit(ds, withSent(ds, s, sent)); sent['sent_' + s] = col; out.push(ds.gateRows.map((i) => col[i])); }
  return out;
}

async function domain(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), A = (c) => round6(auc(c, gy)), arm = (cols) => ({ linear: round6(oofAuc(linear, cols, gy, FOLDS)), trees: round6(oofAuc(T, cols, gy, FOLDS)) });
  const names = Object.keys(ds.silos), own = Object.fromEntries(names.map((s) => { const m = boosted(silo(ds, s), ds.fitRows); return [s, ds.gateRows.map((i) => m.score(i))]; }));
  const pooledM = boosted({ features: ds.features, cols: ds.cols, y: ds.y }, ds.fitRows);
  const strong = [...names].sort((a, b) => A(own[b]) - A(own[a]) || (a < b ? -1 : 1));
  const pairs = [];
  names.forEach((a, k) => names.slice(k + 1).forEach((b) => {
    const v = { features: [...ds.silos[a], ...ds.silos[b]], cols: ds.cols, y: ds.y }, m = boosted(v, ds.fitRows), merged = ds.gateRows.map((i) => m.score(i));
    pairs.push({ merged: [a, b], alone: A(merged), mesh: arm([merged, ...names.filter((s) => s !== a && s !== b).map((s) => own[s])]) });
  }));
  const relayed = (order) => { const cols = relay(ds, order); return { order, last: A(cols[cols.length - 1]), departments: cols.map(A), mesh: arm(cols) }; };
  return {
    cases: ds.gateRows.length, outcomes: gy.reduce((a, v) => a + v, 0),
    pooled: A(ds.gateRows.map((i) => pooledM.score(i))),
    departments: names.map((s) => ({ department: s, columns: ds.silos[s].length, boosted: A(own[s]) })),
    boostedMesh: arm(names.map((s) => own[s])),
    pairs,
    relayStrongFirst: relayed(strong),
    relayWeakFirst: relayed([...strong].reverse()),
  };
}

export async function measure() {
  const out = { kind: 'dex-frontier.diagnose-4', v: 1, on: 'FIT and GATE only; TEST never read; boosted trees stand in for a body', folds: FOLDS, trees: TREES };
  for (const d of DOMAINS) out[d] = await domain(load(d).ds);
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(load('coupon').ds))) === JSON.stringify(out.coupon);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/diagnose-4.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/diagnose-4.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/diagnose-4.json', import.meta.url), text); console.log('wrote data/diagnose-4.json · ' + sha256Hex(text).slice(0, 16)); }
}

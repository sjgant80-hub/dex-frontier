#!/usr/bin/env node
// tools/diagnose-5.mjs — after data/diagnose-4.json: can GROWN bodies use a relay? FIT and GATE only, TEST never read
// (scrambling every TEST record leaves this record unchanged, and it says so). diagnose-4 found, with boosted trees
// standing in for a body, that one score per department loses about 0.03 against every record pooled in both 2h domains,
// and that a relay wins most of it back: departments grow in turn, strongest first, each on its own columns and the
// scores the stronger ones send it. Here the bodies are the ones a department really grows (src/deep.mjs, the four deep
// bodies of organ 2h, the best on GATE fielded). A genome reads at most MAXFEATS columns, so a department takes the sent
// scores of the stronger departments that fit beside its own columns, strongest first, and says how many it took.
// A score sent for a FIT case comes from a body that never grew on that case (four folds); for a GATE case, from the body
// grown on all of FIT. Arms, each coupled out of fold (4 folds) on GATE: every department alone (2h's mesh, one score
// each), and the relay (every department's relayed score).
// Deterministic:  node tools/diagnose-5.mjs [--check] → data/diagnose-5.json
import { writeFileSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { linear, trees, oofAuc } from '../src/select.mjs';
import { growDeep, scoreDeep } from '../src/deep.mjs';
import { auc, round6, MAXFEATS } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { DOMAINS, load } from './contest-2h.mjs';
import { DEEP_BODIES, SEED } from './measure-2h.mjs';

export const FOLDS = 4;
const T = trees(TREES), KINDS = Object.keys(DEEP_BODIES);

/** a department's columns, with the sent scores that fit beside them (strongest sender first) */
export function withSent(ds, s, sent) {
  const v = silo(ds, s), room = Math.max(0, MAXFEATS - v.features.length), took = Object.keys(sent).slice(0, room);
  return { view: { ...v, features: [...v.features, ...took], cols: { ...v.cols, ...Object.fromEntries(took.map((k) => [k, sent[k]])) } }, took: took.length };
}

/** grow every deep body on FIT; field the best on GATE (a tie fields the earlier) */
function field(ds, view) {
  const gy = ds.gateRows.map((i) => ds.y[i]), bodies = KINDS.map((k) => growDeep(view, ds.fitRows, SEED, DEEP_BODIES[k]));
  const gate = bodies.map((b) => round6(auc(ds.gateRows.map((i) => scoreDeep(b, view, i)), gy))), k = gate.reduce((b, g, j) => (g > gate[b] ? j : b), 0);
  return { kind: KINDS[k], body: bodies[k], gate: Object.fromEntries(KINDS.map((x, j) => [x, gate[j]])), gateAuc: gate[k] };
}

/** the score a department sends: on FIT from a body of its fielded kind that never grew on the case, on GATE from its body */
function sendOf(ds, view, f) {
  const col = new Float64Array(ds.n);
  for (let k = 0; k < FOLDS; k++) {
    const b = growDeep(view, ds.fitRows.filter((_, j) => j % FOLDS !== k), SEED, DEEP_BODIES[f.kind]);
    for (const i of ds.fitRows.filter((_, j) => j % FOLDS === k)) col[i] = scoreDeep(b, view, i);
  }
  for (const i of ds.gateRows) col[i] = scoreDeep(f.body, view, i);
  return col;
}

async function domain(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), arm = (cols) => ({ linear: round6(oofAuc(linear, cols, gy, FOLDS)), trees: round6(oofAuc(T, cols, gy, FOLDS)) });
  const names = Object.keys(ds.silos), alone = Object.fromEntries(names.map((s) => [s, field(ds, silo(ds, s))]));
  const order = [...names].sort((a, b) => alone[b].gateAuc - alone[a].gateAuc || (a < b ? -1 : 1));
  const sent = {}, relayed = [];
  for (const [k, s] of order.entries()) {
    const { view, took } = withSent(ds, s, sent), f = k === 0 ? alone[s] : field(ds, view);
    relayed.push({ department: s, took, fielded: f.kind, gate: f.gate, gateAuc: f.gateAuc, col: ds.gateRows.map((i) => scoreDeep(f.body, view, i)) });
    if (k < order.length - 1) sent['sent_' + s] = sendOf(ds, view, f);
  }
  return {
    cases: ds.gateRows.length,
    alone: { departments: names.map((s) => ({ department: s, fielded: alone[s].kind, gateAuc: alone[s].gateAuc })), mesh: arm(names.map((s) => ds.gateRows.map((i) => scoreDeep(alone[s].body, silo(ds, s), i)))) },
    relay: { order, departments: relayed.map(({ col, ...d }) => d), last: relayed[relayed.length - 1].gateAuc, mesh: arm(relayed.map((d) => d.col)) },
  };
}

export async function measure() {
  const out = { kind: 'dex-frontier.diagnose-5', v: 1, on: 'FIT and GATE only; TEST never read; grown deep bodies', folds: FOLDS, trees: TREES, maxColumns: MAXFEATS };
  for (const d of DOMAINS) out[d] = await domain(load(d).ds);
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(load('coupon').ds))) === JSON.stringify(out.coupon);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/diagnose-5.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/diagnose-5.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/diagnose-5.json', import.meta.url), text); console.log('wrote data/diagnose-5.json · ' + sha256Hex(text).slice(0, 16)); }
}

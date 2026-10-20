#!/usr/bin/env node
// tools/study-body-3.mjs — the third body study, FIT and GATE only, TEST never read (scrambling every TEST record leaves
// this record unchanged, and it says so). The second (data/study-body-2.json) found that cutting a column between its
// values moves no mesh, and that what separates a grown body from a boosted department is interactions inside the
// department. src/deep.mjs's PAIRS lets a rule hold two conditions (a slice of two columns at once). Each department here
// grows five bodies — the six-rule scorecard; the deep body cut on the grid; cut between values; with paired rules on the
// grid; with paired rules cut between values — and each domain's mesh is scored out of fold on GATE, the department
// fielding the best on GATE of the first three bodies, of the first four, or of all five.
// Deterministic:  node tools/study-body-3.mjs [--check] → data/study-body-3.json
import { writeFileSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { scores, BAR } from '../src/node.mjs';
import { linear, trees, choose } from '../src/select.mjs';
import { growDeep, scoreDeep } from '../src/deep.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { load } from './contest-fresh.mjs';

const COUPLERS = [linear, trees(TREES)];
export const BODIES = [['deep-quantile', { cuts: 'quantile' }], ['deep-values', { cuts: 'values' }], ['pairs-quantile', { cuts: 'quantile', pairs: true }], ['pairs-values', { cuts: 'values', pairs: true }]];

async function domain(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), A = (c) => round6(auc(c, gy)), grown = await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)), { seed: 1 });
  const deps = grown.map((n) => {
    const bodies = [{ body: 'six', gate: n.advert.gateAuc, col: scores(n.organism, n.view, ds.gateRows), live: n.advert.state === 'live' }];
    for (const [name, cfg] of BODIES) { const b = growDeep(n.view, ds.fitRows, 1, cfg), col = ds.gateRows.map((i) => scoreDeep(b, n.view, i)), g = A(col); bodies.push({ body: name, gate: g, col, live: g >= BAR, stages: b.stages.length, rules: b.rules }); }
    return { department: n.name, bodies };
  });
  const mesh = (k) => {
    const pick = deps.map((d) => d.bodies.slice(0, k).reduce((a, b) => (b.gate > a.gate ? b : a))), live = pick.filter((b) => b.live), c = choose(COUPLERS, live.map((b) => b.col), gy, 4);
    return { fielded: pick.map((b) => b.body), chosen: c.chosen, outOfFold: round6(Math.max(...c.scored.map((s) => s.oof))) };
  };
  return { departments: deps.map((d) => ({ department: d.department, bodies: d.bodies.map(({ col, ...b }) => b) })), three: mesh(3), four: mesh(4), five: mesh(5) };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.study-body-3', v: 1, on: 'FIT and GATE only; TEST never read' };
  const doms = [['telco', D.telco], ['shop', D.shop], ['bank', load('bank').ds], ['adult', load('adult').ds]];
  for (const [name, ds] of doms) out[name] = await domain(ds);
  out.mean = Object.fromEntries(['three', 'four', 'five'].map((k) => [k, round6(doms.reduce((a, [d]) => a + out[d][k].outOfFold, 0) / doms.length)]));
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(D.telco))) === JSON.stringify(out.telco);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/study-body-3.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/study-body-3.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/study-body-3.json', import.meta.url), text); console.log('wrote data/study-body-3.json · ' + sha256Hex(text).slice(0, 16)); }
}

#!/usr/bin/env node
// tools/study-body-2.mjs — the second body study, FIT and GATE only, TEST never read (scrambling every TEST record leaves
// this record unchanged, and it says so). The first (data/study-body.json) found budget, stages and held share changed
// nothing; a probe found cutting a column between its actual values (src/deep.mjs cuts 'values') helps coded departments
// and hurts others. So each department grows three bodies (the six-rule scorecard, the deep body cut on the quantile grid,
// the deep body cut between values) and fields the best on GATE. Against organ 2f's rule (the better of the first two),
// each domain's mesh is scored out of fold on GATE. Either way the coupling is chosen as in organ 2f.
// Deterministic:  node tools/study-body-2.mjs [--check] → data/study-body-2.json
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

async function domain(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), A = (c) => round6(auc(c, gy)), grown = await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)), { seed: 1 });
  const deps = grown.map((n) => {
    const bodies = [{ body: 'six', gate: n.advert.gateAuc, col: scores(n.organism, n.view, ds.gateRows), live: n.advert.state === 'live' }];
    for (const cuts of ['quantile', 'values']) { const b = growDeep(n.view, ds.fitRows, 1, { cuts }), col = ds.gateRows.map((i) => scoreDeep(b, n.view, i)), g = A(col); bodies.push({ body: 'deep-' + cuts, gate: g, col, live: g >= BAR, stages: b.stages.length }); }
    const best = (k) => bodies.slice(0, k).reduce((a, b) => (b.gate > a.gate ? b : a));
    return { department: n.name, bodies: bodies.map(({ col, ...b }) => b), two: best(2), three: best(3) };
  });
  const mesh = (key) => { const live = deps.map((d) => d[key]).filter((b) => b.live), pick = choose(COUPLERS, live.map((b) => b.col), gy, 4); return { fielded: deps.map((d) => d[key].body), chosen: pick.chosen, outOfFold: round6(Math.max(...pick.scored.map((s) => s.oof))) }; };
  return { departments: deps.map((d) => ({ department: d.department, bodies: d.bodies })), two: mesh('two'), three: mesh('three') };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.study-body-2', v: 1, on: 'FIT and GATE only; TEST never read' };
  const doms = [['telco', D.telco], ['shop', D.shop], ['bank', load('bank').ds], ['adult', load('adult').ds]];
  for (const [name, ds] of doms) out[name] = await domain(ds);
  out.mean = Object.fromEntries(['two', 'three'].map((k) => [k, round6(doms.reduce((a, [d]) => a + out[d][k].outOfFold, 0) / doms.length)]));
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(D.telco))) === JSON.stringify(out.telco);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/study-body-2.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/study-body-2.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/study-body-2.json', import.meta.url), text); console.log('wrote data/study-body-2.json · ' + sha256Hex(text).slice(0, 16)); }
}

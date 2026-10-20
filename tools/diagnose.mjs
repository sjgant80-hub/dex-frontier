#!/usr/bin/env node
// tools/diagnose.mjs — where the gap to the pooled model comes from, measured on FIT and GATE only: TEST is never read
// (scrambling every TEST record leaves this record unchanged, and it says so). Design work before the next seal, kept.
// The grown nodes are tiny (at most six threshold rules) and each department sends one score per case. Two suspects:
//   DEPTH       each node is too shallow to carry its own department's signal;
//   BOTTLENECK  one score per department cannot carry interactions between columns held by different departments.
// Every arm is scored the same way: AUC on GATE, every coupling learned out of fold (4 folds) on GATE.
//   pooled  boosted trees on every column, grown on FIT (the poured model, the bar)
//   grown   the grown nodes, one score each, coupled linear and trees (organ 2e's mesh)
//   deep    one boosted-trees model per department on its own columns, grown on FIT, one score each, coupled
//   rules   the grown nodes sending one number per rule instead of one sum (at most six per department), coupled
//   deepGrown  a deep grown body per department (src/deep.mjs: the same ribosome in stages, each kept only if it pays on
//              rows its search never saw), held to the same bar of 0.6 on GATE, one score each, coupled
// deep near pooled → depth is the gap; deep still short of pooled → the one-score bottleneck is.
// Deterministic:  node tools/diagnose.mjs [--check] → data/diagnose.json
import { writeFileSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { scores } from '../src/node.mjs';
import { linear, trees, oofAuc } from '../src/select.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes, liveOf } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { growDeep, scoreDeep } from '../src/deep.mjs';

const fired = (r, x) => (r.op === '>' ? x > r.v : x <= r.v);

async function domain(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), T = trees(TREES);
  const arm = (cols) => ({ numbers: cols.length, linear: round6(oofAuc(linear, cols, gy)), trees: round6(oofAuc(T, cols, gy)) });
  const pooled = boosted({ features: ds.features, cols: ds.cols, y: ds.y }, ds.fitRows);
  const live = liveOf(await nodes(Object.keys(ds.silos).map((s) => silo(ds, s))));
  const grownCols = live.map((n) => scores(n.organism, n.view, ds.gateRows));
  const ruleCols = live.flatMap((n) => n.organ.body.rules.map((r) => ds.gateRows.map((i) => (fired(r, ds.cols[r.feat][i]) ? r.w : 0))));
  const deep = Object.keys(ds.silos).map((s) => { const v = silo(ds, s), m = boosted(v, ds.fitRows); return { silo: v.name, cols: ds.gateRows.map((i) => m.score(i)) }; });
  const dg = Object.keys(ds.silos).map((s) => { const v = silo(ds, s), b = growDeep(v, ds.fitRows, 1), cols = ds.gateRows.map((i) => scoreDeep(b, v, i)); return { silo: v.name, stages: b.stages.length, rules: b.rules, gate: round6(auc(cols, gy)), cols }; });
  const dgLive = dg.filter((x) => x.gate >= 0.6).sort((a, b) => b.gate - a.gate || (a.silo < b.silo ? -1 : 1));
  return {
    pooled: round6(auc(ds.gateRows.map((i) => pooled.score(i)), gy)),
    grown: { nodes: live.map((n) => n.name), alone: grownCols.map((c) => round6(auc(c, gy))), ...arm(grownCols) },
    rules: arm(ruleCols),
    deepGrown: { bodies: dg.map(({ cols, ...x }) => x), live: dgLive.map((x) => x.silo), ...arm(dgLive.map((x) => x.cols)) },
    deep: { silos: deep.map((d) => d.silo), alone: deep.map((d) => round6(auc(d.cols, gy))), ...arm(deep.map((d) => d.cols)) },
  };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.diagnose', v: 1, on: 'FIT and GATE only; TEST never read', settings: { folds: 4, trees: TREES } };
  for (const d of ['telco', 'shop']) out[d] = await domain(D[d]);
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(D.telco))) === JSON.stringify(out.telco);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/diagnose.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/diagnose.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/diagnose.json', import.meta.url), text); console.log('wrote data/diagnose.json · ' + sha256Hex(text).slice(0, 16)); }
}

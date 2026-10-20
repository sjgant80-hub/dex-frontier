#!/usr/bin/env node
// tools/diagnose-2.mjs — after organ 2f: where is the mesh's remaining gap to every record pooled? Measured on FIT and
// GATE only: TEST is never read (scrambling every TEST record leaves this record unchanged, and it says so). Design work
// for the next attempt, kept. For every department of all four datasets, on GATE:
//   six      the seed library's six-rule scorecard (the living-seed node)
//   deep     the deep staged body organ 2f fielded when it was better (src/deep.mjs)
//   boosted  boosted trees on the department's own columns, grown on FIT: how much signal its columns hold
// and for every domain, every coupling out of fold (4 folds) on GATE: the pooled model (boosted trees on every column,
// grown on FIT), organ 2f's mesh (the better body of each department), and a mesh of the boosted departments (one score
// each: what one score per department can carry). Boosted near pooled and 2f's mesh short of both → the bodies are
// the gap; boosted short of pooled → one score per department is.
// Deterministic:  node tools/diagnose-2.mjs [--check] → data/diagnose-2.json
import { writeFileSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { scores, BAR } from '../src/node.mjs';
import { linear, trees, oofAuc } from '../src/select.mjs';
import { growDeep, scoreDeep } from '../src/deep.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read, datasets, nodes } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { load } from './contest-fresh.mjs';

const T = trees(TREES);

export async function domain(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), A = (c) => round6(auc(c, gy)), arm = (cols) => ({ numbers: cols.length, linear: round6(oofAuc(linear, cols, gy)), trees: round6(oofAuc(T, cols, gy)) });
  const grown = await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)), { seed: 1 });
  const deps = grown.map((n) => {
    const deep = growDeep(n.view, ds.fitRows, 1), deepCol = ds.gateRows.map((i) => scoreDeep(deep, n.view, i)), sixCol = scores(n.organism, n.view, ds.gateRows);
    const b = boosted(n.view, ds.fitRows), bCol = ds.gateRows.map((i) => b.score(i));
    const fielded = A(deepCol) > n.advert.gateAuc ? 'deep' : 'six', live = fielded === 'deep' ? A(deepCol) >= BAR : n.advert.state === 'live';
    return { department: n.name, columns: n.view.features.length, six: n.advert.gateAuc, deep: A(deepCol), deepStages: deep.stages.length, boosted: A(bCol), fielded, live, col: fielded === 'deep' ? deepCol : sixCol, bCol };
  });
  const live = deps.filter((d) => d.live), pooled = boosted({ features: ds.features, cols: ds.cols, y: ds.y }, ds.fitRows);
  return {
    pooled: A(ds.gateRows.map((i) => pooled.score(i))),
    departments: deps.map(({ col, bCol, ...d }) => d),
    mesh2f: { live: live.map((d) => d.department), ...arm(live.map((d) => d.col)) },
    meshBoosted: { live: live.map((d) => d.department), ...arm(live.map((d) => d.bCol)) },
  };
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.diagnose-2', v: 1, on: 'FIT and GATE only; TEST never read', settings: { folds: 4, trees: TREES } };
  for (const [name, ds] of [['telco', D.telco], ['shop', D.shop], ['bank', load('bank').ds], ['adult', load('adult').ds]]) out[name] = await domain(ds);
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(D.telco))) === JSON.stringify(out.telco);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/diagnose-2.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/diagnose-2.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/diagnose-2.json', import.meta.url), text); console.log('wrote data/diagnose-2.json · ' + sha256Hex(text).slice(0, 16)); }
}

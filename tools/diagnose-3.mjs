#!/usr/bin/env node
// tools/diagnose-3.mjs — after organ 2g: on the hospital and the credit clients, what holds the mesh back? FIT and GATE
// only, TEST never read (scrambling every TEST record leaves this record unchanged, and it says so). In 2g every hospital
// department scored under its bar alone. Here no bar applies: every department is kept, so the question is only what its
// columns can carry. Arms, each coupled out of fold (4 folds) on GATE: every record pooled (boosted trees grown on FIT);
// organ 2g's grown bodies (each department's best on GATE of five); and one deep boosted model per department on its own
// columns (one score each). Boosted departments near pooled and grown short of both → the grown bodies are the gap.
// Deterministic:  node tools/diagnose-3.mjs [--check] → data/diagnose-3.json
import { writeFileSync } from 'node:fs';
import { silo } from '../src/silos.mjs';
import { linear, trees, oofAuc } from '../src/select.mjs';
import { scoreDeep } from '../src/deep.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read } from './mesh.mjs';
import { TREES } from './measure-2d.mjs';
import { scrambleTest } from './measure-1.mjs';
import { departments } from './measure-2g.mjs';
import { load } from './contest-2g.mjs';

const T = trees(TREES);

async function domain(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), A = (c) => round6(auc(c, gy)), arm = (cols) => ({ linear: round6(oofAuc(linear, cols, gy)), trees: round6(oofAuc(T, cols, gy)) });
  const pooled = boosted({ features: ds.features, cols: ds.cols, y: ds.y }, ds.fitRows);
  const deps = await departments(ds), answers = (d) => { const c = d.score(ds.gateRows); return c.every((v) => v !== null) ? c : null; };   // a six-rule body cut by its organism answers nothing
  const grownCols = deps.map(answers).filter(Boolean);
  const boostedCols = Object.keys(ds.silos).map((s) => { const v = silo(ds, s), m = boosted(v, ds.fitRows); return { department: v.name, col: ds.gateRows.map((i) => m.score(i)) }; });
  return {
    pooled: A(ds.gateRows.map((i) => pooled.score(i))),
    departments: deps.map((d, k) => ({ department: d.name, fielded: d.fielded, grown: d.gateAuc, answers: answers(d) !== null, boosted: A(boostedCols[k].col) })),
    grownMesh: { departments: grownCols.length, ...arm(grownCols) },
    boostedMesh: { departments: boostedCols.length, ...arm(boostedCols.map((b) => b.col)) },
  };
}

export async function measure() {
  const H = load('hospital').ds, out = { kind: 'dex-frontier.diagnose-3', v: 1, on: 'FIT and GATE only; TEST never read; no bar', hospital: await domain(H), credit: await domain(load('credit').ds) };
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(H))) === JSON.stringify(out.hospital);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/diagnose-3.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/diagnose-3.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/diagnose-3.json', import.meta.url), text); console.log('wrote data/diagnose-3.json · ' + sha256Hex(text).slice(0, 16)); }
}

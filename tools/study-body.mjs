#!/usr/bin/env node
// tools/study-body.mjs — which deep body to field next: FIT and GATE only, TEST never read (scrambling every TEST record
// leaves this record unchanged, and it says so). The diagnosis after organ 2f (data/diagnose-2.json) found the grown
// bodies, not one score per department, to be the remaining gap. Each of the 14 departments of the four datasets grows
// its deep body (src/deep.mjs) in four settings, each scored on GATE alone, and each domain's mesh (the better of the
// six-rule and the deep body per department, the coupling chosen out of fold on GATE, as in organ 2f) is scored out of
// fold on GATE. The setting chosen for the next sealed attempt is the one with the best mean mesh, on these rows only.
// Deterministic:  node tools/study-body.mjs [--check] → data/study-body.json
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

export const SETTINGS = {
  A: { stages: 8, held: 1 / 3 },
  B: { stages: 16, held: 1 / 3 },
  C: { stages: 16, held: 1 / 2 },
  D: { stages: 16, held: 1 / 2, population: 80, generations: 40 },
};
const COUPLERS = [linear, trees(TREES)];

async function domain(ds) {
  const gy = ds.gateRows.map((i) => ds.y[i]), A = (c) => round6(auc(c, gy)), grown = await nodes(Object.keys(ds.silos).map((s) => silo(ds, s)), { seed: 1 });
  const out = {};
  for (const [name, cfg] of Object.entries(SETTINGS)) {
    const deps = grown.map((n) => {
      const deep = growDeep(n.view, ds.fitRows, 1, cfg), col = ds.gateRows.map((i) => scoreDeep(deep, n.view, i)), g = A(col);
      const fielded = g > n.advert.gateAuc ? 'deep' : 'six', live = fielded === 'deep' ? g >= BAR : n.advert.state === 'live';
      return { department: n.name, deep: g, stages: deep.stages.length, rules: deep.rules, fielded, live, col: fielded === 'deep' ? col : scores(n.organism, n.view, ds.gateRows) };
    });
    const live = deps.filter((d) => d.live), pick = choose(COUPLERS, live.map((d) => d.col), gy, 4);
    out[name] = { departments: deps.map(({ col, ...d }) => d), mesh: { chosen: pick.chosen, outOfFold: round6(Math.max(...pick.scored.map((s) => s.oof))) } };
  }
  return out;
}

export async function measure() {
  const D = datasets(), out = { kind: 'dex-frontier.study-body', v: 1, on: 'FIT and GATE only; TEST never read', settings: SETTINGS };
  for (const [name, ds] of [['telco', D.telco], ['shop', D.shop], ['bank', load('bank').ds], ['adult', load('adult').ds]]) out[name] = await domain(ds);
  const doms = ['telco', 'shop', 'bank', 'adult'];
  out.meanMesh = Object.fromEntries(Object.keys(SETTINGS).map((k) => [k, round6(doms.reduce((a, d) => a + out[d][k].mesh.outOfFold, 0) / doms.length)]));
  out.chosen = Object.keys(SETTINGS).reduce((b, k) => (out.meanMesh[k] > out.meanMesh[b] ? k : b), 'A');
  out.testNeverRead = JSON.stringify(await domain(scrambleTest(D.telco))) === JSON.stringify(out.telco);
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/study-body.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/study-body.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/study-body.json', import.meta.url), text); console.log('wrote data/study-body.json · ' + sha256Hex(text).slice(0, 16)); }
}

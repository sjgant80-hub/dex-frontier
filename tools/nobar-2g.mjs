#!/usr/bin/env node
// tools/nobar-2g.mjs — AFTER organ 2g was judged, NOT sealed: was the bar the hospital's only problem? In 2g every hospital
// department scored under its 0.6 bar on its own (0.54 to 0.58 on GATE), so all five were cut and no mesh formed, while
// every record pooled reached 0.659. Here the same departments, each fielding the body it fielded in 2g, are all kept,
// coupled as 2g couples (chosen out of fold on GATE), and scored on TEST against the same rivals. This cannot pass any
// sealed rule: its cases have been seen. It answers what the next sealed attempt should change. Kept beside the result.
// Deterministic:  node tools/nobar-2g.mjs [--check] → data/organ-2g/nobar.json
import { writeFileSync } from 'node:fs';
import { pooled } from '../src/silos.mjs';
import { lead } from '../src/stats.mjs';
import { boosted } from '../vendor/living-seed/src/baseline.mjs';
import { auc, round6 } from '../vendor/living-seed/vendor/seed-library/seedlib.mjs';
import { sha256Hex } from '../vendor/living-seed/vendor/seed-library/sha256.mjs';
import { read } from './mesh.mjs';
import { departments, meshOf } from './measure-2g.mjs';
import { load, sampleOf } from './contest-2g.mjs';

export async function measure() {
  const out = { kind: 'dex-frontier.organ-2g.nobar', v: 1, when: 'after organ 2g was judged; not sealed', domain: 'hospital' };
  const { ds } = load('hospital'), testY = ds.testRows.map((i) => ds.y[i]), deps = await departments(ds);
  const all = deps.map((d) => ({ ...d, state: 'live' })).sort((a, b) => b.gateAuc - a.gateAuc || (a.name < b.name ? -1 : 1)), m = meshOf(all, ds);
  const singles = all.map((d, k) => ({ department: d.name, fielded: d.fielded, gateAuc: d.gateAuc, testAuc: round6(auc(m.testCols[k], testY)) }));
  const bestK = singles.reduce((b, s, k) => (s.testAuc > singles[b].testAuc ? k : b), 0);
  const growth = all.map((d, k) => { const g = meshOf(all.slice(0, k + 1), ds); return { departments: k + 1, added: d.name, chosen: g.pick.chosen, testAuc: round6(auc(g.composed, testY)), composed: g.composed }; });
  const P = pooled(ds), boost = boosted(P, P.rows), boostS = ds.testRows.map((i) => boost.score(i));
  const at = new Map(ds.testRows.map((i, r) => [i, r])), rows = sampleOf(ds), y = rows.map((i) => ds.y[i]), answered = new Map();
  for (let b = 1; b <= 4; b++) for (const c of JSON.parse(read('data/llm/frontier-hospital-' + b + '.json')).calls) answered.set(c.row, c.p);
  const front = rows.map((i) => (answered.get(i) ?? null) === null ? 0.5 : answered.get(i));
  Object.assign(out, {
    departments: singles, chosen: m.pick.chosen, composedAuc: round6(auc(m.composed, testY)), best: singles[bestK],
    vsBest: lead(m.composed, m.testCols[bestK], testY), growth: growth.map(({ composed, ...g }) => g), fullVsFirst: lead(m.composed, growth[0].composed, testY),
    vsFrontier: lead(rows.map((i) => m.composed[at.get(i)]), front, y), vsPooled: lead(m.composed, boostS, testY),
  });
  return out;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tools/nobar-2g.mjs');
if (isMain) {
  const text = JSON.stringify(await measure(), null, 1) + '\n';
  if (process.argv.includes('--check')) { const c = read('data/organ-2g/nobar.json'); if (c !== text) { console.log('RECORD MISMATCH · committed ' + sha256Hex(c).slice(0, 16) + ' vs re-run ' + sha256Hex(text).slice(0, 16)); process.exit(1); } console.log('RECORD REPRODUCED · ' + sha256Hex(text).slice(0, 16)); }
  else { writeFileSync(new URL('../data/organ-2g/nobar.json', import.meta.url), text); console.log('wrote data/organ-2g/nobar.json · ' + sha256Hex(text).slice(0, 16)); }
}
